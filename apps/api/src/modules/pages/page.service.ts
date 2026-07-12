import { IsNull } from "typeorm";
import { Page, PageAccess } from "../../entities/page.entity.js";
import { PageVersion } from "../../entities/page-version.entity.js";
import { PageLabel } from "../../entities/page-label.entity.js";
import { Favorite } from "../../entities/favorite.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { AppDataSource } from "../../config/data-source.js";
import { WorkspaceRole } from "../../common/roles.js";

const VERSION_DEBOUNCE_MS = 10 * 60 * 1000;
const MAX_VERSIONS = 20;

class PageService {
  canRead(page: Page, actorId: string): boolean {
    if (page.ownedById === actorId) return true;
    return page.access === PageAccess.PUBLIC;
  }

  canWrite(page: Page, actorId: string, projectRole: WorkspaceRole): boolean {
    if (page.ownedById === actorId) return !page.isLocked;
    if (page.access === PageAccess.PRIVATE) return false;
    if (page.isLocked) return false;
    return projectRole >= WorkspaceRole.MEMBER;
  }

  async list(project: Project, actorId: string) {
    const pages = await Page.find({ where: { projectId: project.id, parentId: IsNull() }, order: { sortOrder: "ASC" } });
    return pages.filter((p) => this.canRead(p, actorId));
  }

  async summary(project: Project, actorId: string) {
    const pages = await Page.find({ where: { projectId: project.id } });
    const readable = pages.filter((p) => this.canRead(p, actorId));
    return {
      publicPages: readable.filter((p) => p.access === PageAccess.PUBLIC && !p.archivedAt).length,
      privatePages: readable.filter((p) => p.access === PageAccess.PRIVATE && !p.archivedAt).length,
      archivedPages: readable.filter((p) => p.archivedAt !== null).length,
    };
  }

  async findOrThrow(projectId: string, pageId: string, actorId: string): Promise<Page> {
    const page = await Page.findOne({ where: { id: pageId, projectId } });
    if (!page || !this.canRead(page, actorId)) {
      throw new ApiError(404, "page_not_found", "Página não encontrada.");
    }
    return page;
  }

  async create(
    project: Project,
    actor: User,
    input: { name?: string; descriptionJson?: Record<string, unknown>; descriptionHtml?: string; parentId?: string | null; access?: PageAccess },
  ) {
    const maxSortOrder = await Page.getRepository()
      .createQueryBuilder("p")
      .select("MAX(p.sortOrder)", "max")
      .where("p.projectId = :projectId", { projectId: project.id })
      .getRawOne<{ max: number | null }>();

    const page = Page.create({
      workspaceId: project.workspaceId,
      projectId: project.id,
      name: input.name ?? "",
      descriptionJson: input.descriptionJson ?? {},
      descriptionHtml: input.descriptionHtml ?? "<p></p>",
      ownedById: actor.id,
      access: input.access ?? PageAccess.PUBLIC,
      parentId: input.parentId ?? null,
      sortOrder: (maxSortOrder?.max ?? 0) + 10000,
    });
    await page.save();
    return page;
  }

  async update(
    page: Page,
    actor: User,
    projectRole: WorkspaceRole,
    input: { name?: string; color?: string | null; parentId?: string | null; logoProps?: Record<string, unknown>; viewProps?: Record<string, unknown> },
  ) {
    if (!this.canWrite(page, actor.id, projectRole)) {
      throw new ApiError(403, "insufficient_permission", "Você não pode editar esta página.");
    }
    Object.assign(page, input);
    await page.save();
    return page;
  }

  async changeAccess(page: Page, actor: User, access: PageAccess) {
    if (page.ownedById !== actor.id) {
      throw new ApiError(403, "only_owner_can_change_access", "Só o dono pode alterar a visibilidade da página.");
    }
    page.access = access;
    await page.save();
    return page;
  }

  async updateDescription(
    page: Page,
    actor: User,
    projectRole: WorkspaceRole,
    input: { descriptionJson?: Record<string, unknown>; descriptionHtml?: string },
  ) {
    if (!this.canWrite(page, actor.id, projectRole)) {
      throw new ApiError(403, "insufficient_permission", "Você não pode editar esta página.");
    }
    if (input.descriptionJson !== undefined) page.descriptionJson = input.descriptionJson;
    if (input.descriptionHtml !== undefined) page.descriptionHtml = input.descriptionHtml;
    await page.save();

    await this.trackVersion(page, actor.id);
    return page;
  }

  private async trackVersion(page: Page, actorId: string): Promise<void> {
    const latest = await PageVersion.findOne({ where: { pageId: page.id }, order: { createdAt: "DESC" } });
    const withinDebounce = latest && Date.now() - latest.createdAt.getTime() < VERSION_DEBOUNCE_MS;

    if (withinDebounce) {
      latest.descriptionJson = page.descriptionJson;
      latest.descriptionHtml = page.descriptionHtml;
      await latest.save();
      return;
    }

    const version = PageVersion.create({
      pageId: page.id,
      descriptionJson: page.descriptionJson,
      descriptionHtml: page.descriptionHtml,
      savedById: actorId,
    });
    await version.save();

    const count = await PageVersion.count({ where: { pageId: page.id } });
    if (count > MAX_VERSIONS) {
      const oldest = await PageVersion.find({ where: { pageId: page.id }, order: { createdAt: "ASC" }, take: count - MAX_VERSIONS });
      await PageVersion.getRepository().remove(oldest);
    }
  }

  async listVersions(pageId: string) {
    return PageVersion.find({ where: { pageId }, order: { createdAt: "DESC" } });
  }

  async restoreVersion(page: Page, versionId: string) {
    const version = await PageVersion.findOne({ where: { id: versionId, pageId: page.id } });
    if (!version) {
      throw new ApiError(404, "page_version_not_found", "Versão não encontrada.");
    }
    page.descriptionJson = version.descriptionJson;
    page.descriptionHtml = version.descriptionHtml;
    await page.save();
    return page;
  }

  async remove(page: Page, projectRole: WorkspaceRole) {
    if (projectRole < WorkspaceRole.ADMIN) {
      throw new ApiError(403, "insufficient_permission", "Só Admin pode excluir páginas.");
    }
    if (!page.archivedAt) {
      throw new ApiError(422, "page_not_archived", "Arquive a página antes de excluí-la.");
    }
    await AppDataSource.transaction(async (manager) => {
      await manager.delete(Favorite, { entityType: "page", entityId: page.id });
      await manager.delete(PageLabel, { pageId: page.id });
      await manager.remove(page);
    });
  }

  private async getDescendantIds(projectId: string, rootId: string): Promise<string[]> {
    const all = await Page.find({ where: { projectId } });
    const childrenByParent = new Map<string, string[]>();
    for (const p of all) {
      if (!p.parentId) continue;
      const list = childrenByParent.get(p.parentId) ?? [];
      list.push(p.id);
      childrenByParent.set(p.parentId, list);
    }
    const result: string[] = [];
    let frontier = [rootId];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const id of frontier) {
        const children = childrenByParent.get(id) ?? [];
        for (const childId of children) {
          result.push(childId);
          next.push(childId);
        }
      }
      frontier = next;
    }
    return result;
  }

  async archive(page: Page) {
    const descendantIds = await this.getDescendantIds(page.projectId, page.id);
    const now = new Date();
    await Page.getRepository().update([page.id, ...descendantIds], { archivedAt: now });
    return (await Page.findOneBy({ id: page.id }))!;
  }

  async unarchive(page: Page) {
    const descendantIds = await this.getDescendantIds(page.projectId, page.id);
    await Page.getRepository().update([page.id, ...descendantIds], { archivedAt: null });
    return (await Page.findOneBy({ id: page.id }))!;
  }

  async lock(page: Page) {
    page.isLocked = true;
    await page.save();
    return page;
  }

  async unlock(page: Page) {
    page.isLocked = false;
    await page.save();
    return page;
  }

  async duplicate(project: Project, page: Page, actor: User) {
    if (page.access === PageAccess.PRIVATE && page.ownedById !== actor.id) {
      throw new ApiError(403, "insufficient_permission", "Você não pode duplicar esta página privada.");
    }
    const copy = Page.create({
      workspaceId: project.workspaceId,
      projectId: project.id,
      name: `${page.name} (cópia)`,
      descriptionJson: page.descriptionJson,
      descriptionHtml: page.descriptionHtml,
      ownedById: actor.id,
      access: page.access,
      color: page.color,
      parentId: page.parentId,
      logoProps: page.logoProps,
      viewProps: page.viewProps,
    });
    await copy.save();
    return copy;
  }
}

export const pageService = new PageService();
