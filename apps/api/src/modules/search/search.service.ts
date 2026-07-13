import { Project } from "../../entities/project.entity.js";
import { Issue } from "../../entities/issue.entity.js";
import { Page } from "../../entities/page.entity.js";
import { Cycle } from "../../entities/cycle.entity.js";
import { ProjectModule } from "../../entities/module.entity.js";
import { WorkspaceRole } from "../../common/roles.js";
import { pageService } from "../pages/page.service.js";

const RESULTS_PER_TYPE = 20;

export const SEARCH_TYPES = ["project", "issue", "page", "cycle", "module"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/**
 * IDs de projeto visíveis ao requisitante — mesma regra de
 * `project.service.ts#listForWorkspace` (Admin vê tudo; Member vê
 * público + onde é membro ativo; Guest só onde é membro ativo).
 * Reimplementada aqui (não importada) para não acoplar o serviço de
 * busca ao serviço de projetos por um detalhe de query.
 */
async function visibleProjectIds(workspaceId: string, requesterRole: WorkspaceRole, userId: string): Promise<string[]> {
  const qb = Project.getRepository()
    .createQueryBuilder("p")
    .select("p.id", "id")
    .where("p.workspaceId = :workspaceId", { workspaceId })
    .andWhere("p.archivedAt IS NULL");

  if (requesterRole < WorkspaceRole.ADMIN) {
    qb.andWhere(
      `(p.network = :publicNetwork OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm."projectId" = p.id AND pm."userId" = :userId AND pm."isActive" = true AND pm."deletedAt" IS NULL
      ))`,
      { publicNetwork: 2, userId },
    );
    if (requesterRole < WorkspaceRole.MEMBER) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm."projectId" = p.id AND pm."userId" = :userId2 AND pm."isActive" = true AND pm."deletedAt" IS NULL
        )`,
        { userId2: userId },
      );
    }
  }

  const rows = await qb.getRawMany<{ id: string }>();
  return rows.map((r) => r.id);
}

class SearchService {
  async search(
    workspaceId: string,
    requesterRole: WorkspaceRole,
    userId: string,
    query: string,
    types?: SearchType[],
  ): Promise<Record<SearchType, unknown[]>> {
    const wanted = new Set(types && types.length > 0 ? types : SEARCH_TYPES);
    const projectIds = await visibleProjectIds(workspaceId, requesterRole, userId);

    const result: Record<SearchType, unknown[]> = { project: [], issue: [], page: [], cycle: [], module: [] };
    if (!query.trim()) return result;

    if (wanted.has("project") && projectIds.length > 0) {
      result.project = await Project.getRepository()
        .createQueryBuilder("p")
        .where("p.id IN (:...ids)", { ids: projectIds })
        .andWhere("p.name ILIKE :q", { q: `%${query}%` })
        .orderBy("p.name", "ASC")
        .take(RESULTS_PER_TYPE)
        .getMany();
    }

    if (projectIds.length === 0) return result;

    if (wanted.has("issue")) {
      result.issue = await Issue.getRepository()
        .createQueryBuilder("i")
        .where("i.projectId IN (:...ids)", { ids: projectIds })
        .andWhere("i.archivedAt IS NULL")
        .andWhere("i.name ILIKE :q", { q: `%${query}%` })
        .orderBy("i.updatedAt", "DESC")
        .take(RESULTS_PER_TYPE)
        .getMany();
    }

    if (wanted.has("cycle")) {
      result.cycle = await Cycle.getRepository()
        .createQueryBuilder("c")
        .where("c.projectId IN (:...ids)", { ids: projectIds })
        .andWhere("c.name ILIKE :q", { q: `%${query}%` })
        .orderBy("c.name", "ASC")
        .take(RESULTS_PER_TYPE)
        .getMany();
    }

    if (wanted.has("module")) {
      result.module = await ProjectModule.getRepository()
        .createQueryBuilder("m")
        .where("m.projectId IN (:...ids)", { ids: projectIds })
        .andWhere("m.name ILIKE :q", { q: `%${query}%` })
        .orderBy("m.name", "ASC")
        .take(RESULTS_PER_TYPE)
        .getMany();
    }

    if (wanted.has("page")) {
      const candidates = await Page.getRepository()
        .createQueryBuilder("pg")
        .where("pg.projectId IN (:...ids)", { ids: projectIds })
        .andWhere("pg.archivedAt IS NULL")
        .andWhere("pg.name ILIKE :q", { q: `%${query}%` })
        .orderBy("pg.updatedAt", "DESC")
        .take(RESULTS_PER_TYPE * 2)
        .getMany();
      result.page = candidates.filter((p) => pageService.canRead(p, userId)).slice(0, RESULTS_PER_TYPE);
    }

    return result;
  }
}

export const searchService = new SearchService();
