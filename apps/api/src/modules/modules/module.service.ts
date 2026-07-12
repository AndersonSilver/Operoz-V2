import { ProjectModule, type ModuleStatus } from "../../entities/module.entity.js";
import { ModuleIssue } from "../../entities/module-issue.entity.js";
import { ModuleLink } from "../../entities/module-link.entity.js";
import { Favorite } from "../../entities/favorite.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { AppDataSource } from "../../config/data-source.js";
import { WorkspaceRole } from "../../common/roles.js";
import { dispatchWebhookEvent } from "../webhooks/webhook-dispatch.js";

const ARCHIVABLE_STATUSES: ModuleStatus[] = ["completed", "cancelled"];

class ModuleService {
  async list(projectId: string) {
    return ProjectModule.find({ where: { projectId }, order: { sortOrder: "ASC" } });
  }

  async listForWorkspace(workspaceId: string, userId: string) {
    return ProjectModule.getRepository()
      .createQueryBuilder("m")
      .innerJoin(
        "project_members",
        "pm",
        `pm."projectId" = m."projectId" AND pm."userId" = :userId AND pm."isActive" = true AND pm."deletedAt" IS NULL`,
        { userId },
      )
      .innerJoin("projects", "p", `p.id = m."projectId" AND p."workspaceId" = :workspaceId AND p."archivedAt" IS NULL`, {
        workspaceId,
      })
      .orderBy("m.createdAt", "DESC")
      .getMany();
  }

  async findOrThrow(projectId: string, moduleId: string): Promise<ProjectModule> {
    const mod = await ProjectModule.findOne({ where: { id: moduleId, projectId } });
    if (!mod) {
      throw new ApiError(404, "module_not_found", "Módulo não encontrado.");
    }
    return mod;
  }

  async create(
    project: Project,
    actor: User,
    input: {
      name: string;
      description?: string;
      startDate?: string | null;
      targetDate?: string | null;
      status?: ModuleStatus;
      leadId?: string | null;
    },
  ) {
    const existing = await ProjectModule.findOne({ where: { projectId: project.id, name: input.name } });
    if (existing) {
      throw new ApiError(409, "module_name_taken", "Já existe um módulo com este nome neste projeto.");
    }

    const minSortOrder = await ProjectModule.getRepository()
      .createQueryBuilder("m")
      .select("MIN(m.sortOrder)", "min")
      .where("m.projectId = :projectId", { projectId: project.id })
      .getRawOne<{ min: number | null }>();

    const mod = ProjectModule.create({
      workspaceId: project.workspaceId,
      projectId: project.id,
      name: input.name,
      description: input.description ?? "",
      startDate: input.startDate ?? null,
      targetDate: input.targetDate ?? null,
      status: input.status ?? "planned",
      leadId: input.leadId ?? null,
      createdById: actor.id,
      sortOrder: (minSortOrder?.min ?? 0) - 10000,
    });
    await mod.save();
    void dispatchWebhookEvent(project.workspaceId, "module", "created", { moduleId: mod.id, name: mod.name });
    return mod;
  }

  async update(
    mod: ProjectModule,
    input: {
      name?: string;
      description?: string;
      startDate?: string | null;
      targetDate?: string | null;
      status?: ModuleStatus;
      leadId?: string | null;
      sortOrder?: number;
    },
  ) {
    if (mod.archivedAt) {
      throw new ApiError(422, "module_archived", "Desarquive o módulo antes de editá-lo.");
    }
    if (input.name !== undefined && input.name !== mod.name) {
      const existing = await ProjectModule.findOne({ where: { projectId: mod.projectId, name: input.name } });
      if (existing) {
        throw new ApiError(409, "module_name_taken", "Já existe um módulo com este nome neste projeto.");
      }
    }
    Object.assign(mod, input);
    await mod.save();
    return mod;
  }

  async remove(
    mod: ProjectModule,
    actor: User,
    isWorkspaceAdmin: boolean,
    actorProjectRole: WorkspaceRole,
  ): Promise<void> {
    const isCreator = mod.createdById === actor.id;
    if (!isWorkspaceAdmin && actorProjectRole < WorkspaceRole.ADMIN && !isCreator) {
      throw new ApiError(403, "insufficient_role", "Apenas Admin ou o criador do módulo pode excluí-lo.");
    }
    await AppDataSource.transaction(async (manager) => {
      await manager.delete(ModuleIssue, { moduleId: mod.id });
      await manager.delete(Favorite, { entityType: "module", entityId: mod.id });
      await manager.softDelete(ProjectModule, mod.id);
    });
  }

  async archive(mod: ProjectModule) {
    if (!ARCHIVABLE_STATUSES.includes(mod.status)) {
      throw new ApiError(422, "module_not_completed", "Só é possível arquivar módulos com status completed ou cancelled.");
    }
    mod.archivedAt = new Date();
    await mod.save();
    await Favorite.getRepository().delete({ entityType: "module", entityId: mod.id });
    return mod;
  }

  async unarchive(mod: ProjectModule) {
    mod.archivedAt = null;
    await mod.save();
    return mod;
  }

  async listArchived(projectId: string) {
    return ProjectModule.find({ where: { projectId } }).then((mods) => mods.filter((m) => m.archivedAt !== null));
  }

  // ---- Issues do módulo ----

  async listIssues(moduleId: string) {
    const rows = await ModuleIssue.find({ where: { moduleId }, relations: { issue: true } });
    return rows.map((r) => r.issue);
  }

  /** Bulk-add idempotente: conflitos (issue já no módulo) são ignorados, sem mover nada (M:N livre). */
  async addIssues(project: Project, mod: ProjectModule, issueIds: string[]): Promise<void> {
    for (const issueId of issueIds) {
      const existing = await ModuleIssue.findOne({ where: { moduleId: mod.id, issueId } });
      if (existing) continue;
      const row = ModuleIssue.create({ moduleId: mod.id, issueId });
      await row.save();
    }
  }

  async removeIssue(moduleId: string, issueId: string): Promise<void> {
    await ModuleIssue.getRepository().softDelete({ moduleId, issueId });
  }

  /** Perspectiva da issue: recebe a lista final desejada de módulos e sincroniza (diff add/remove). */
  async setIssueModules(projectId: string, issueId: string, moduleIds: string[]): Promise<void> {
    const current = await ModuleIssue.find({ where: { issueId } });
    const currentModuleIds = new Set(current.map((r) => r.moduleId));
    const desired = new Set(moduleIds);

    const toAdd = [...desired].filter((id) => !currentModuleIds.has(id));
    const toRemove = current.filter((r) => !desired.has(r.moduleId));

    for (const moduleId of toAdd) {
      const mod = await ProjectModule.findOne({ where: { id: moduleId, projectId } });
      if (!mod) continue;
      await ModuleIssue.create({ moduleId, issueId }).save();
    }
    if (toRemove.length > 0) {
      await ModuleIssue.getRepository().softDelete(toRemove.map((r) => r.id));
    }
  }

  async computeProgress(moduleId: string) {
    const rows = await ModuleIssue.getRepository()
      .createQueryBuilder("mi")
      .innerJoin("issues", "i", "i.id = mi.issueId")
      .leftJoin("states", "s", "s.id = i.stateId")
      .select("s.group", "group")
      .addSelect("COUNT(*)", "count")
      .where("mi.moduleId = :moduleId", { moduleId })
      .andWhere("mi.deletedAt IS NULL")
      .groupBy("s.group")
      .getRawMany<{ group: string | null; count: string }>();

    const distribution: Record<string, number> = {
      backlog: 0,
      unstarted: 0,
      started: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of rows) {
      if (row.group && row.group in distribution) distribution[row.group] = Number(row.count);
    }
    return { stateDistribution: distribution };
  }

  // ---- Links ----

  async listLinks(moduleId: string) {
    return ModuleLink.find({ where: { moduleId }, order: { createdAt: "DESC" } });
  }

  async addLink(moduleId: string, input: { url: string; title?: string | null }) {
    try {
      const url = new URL(input.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid_protocol");
    } catch {
      throw new ApiError(422, "invalid_url", "URL inválida.");
    }
    const link = ModuleLink.create({ moduleId, url: input.url, title: input.title ?? null });
    await link.save();
    return link;
  }

  async removeLink(moduleId: string, linkId: string) {
    const link = await ModuleLink.findOne({ where: { id: linkId, moduleId } });
    if (!link) {
      throw new ApiError(404, "module_link_not_found", "Link não encontrado.");
    }
    await link.remove();
  }
}

export const moduleService = new ModuleService();
