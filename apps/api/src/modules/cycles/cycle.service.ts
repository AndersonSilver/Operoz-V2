import { Cycle } from "../../entities/cycle.entity.js";
import { CycleIssue } from "../../entities/cycle-issue.entity.js";
import { Issue } from "../../entities/issue.entity.js";
import { State } from "../../entities/state.entity.js";
import { Favorite } from "../../entities/favorite.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { AppDataSource } from "../../config/data-source.js";
import { WorkspaceRole } from "../../common/roles.js";

type CycleStatus = "draft" | "upcoming" | "current" | "completed";

function computeStatus(cycle: Cycle): CycleStatus {
  if (!cycle.startDate || !cycle.endDate) return "draft";
  const now = new Date();
  if (now < cycle.startDate) return "upcoming";
  if (now > cycle.endDate) return "completed";
  return "current";
}

class CycleService {
  async list(project: Project, view?: string) {
    const cycles = await Cycle.find({ where: { projectId: project.id }, order: { sortOrder: "ASC" } });
    if (!view || view === "all") return cycles;
    return cycles.filter((c) => {
      const status = computeStatus(c);
      if (view === "incomplete") return status !== "completed";
      return status === view;
    });
  }

  async listForWorkspace(workspaceId: string, userId: string) {
    return Cycle.getRepository()
      .createQueryBuilder("c")
      .innerJoin(
        "project_members",
        "pm",
        `pm."projectId" = c."projectId" AND pm."userId" = :userId AND pm."isActive" = true AND pm."deletedAt" IS NULL`,
        { userId },
      )
      .innerJoin("projects", "p", `p.id = c."projectId" AND p."workspaceId" = :workspaceId AND p."archivedAt" IS NULL`, {
        workspaceId,
      })
      .orderBy("c.createdAt", "DESC")
      .getMany();
  }

  async findOrThrow(projectId: string, cycleId: string): Promise<Cycle> {
    const cycle = await Cycle.findOne({ where: { id: cycleId, projectId } });
    if (!cycle) {
      throw new ApiError(404, "cycle_not_found", "Ciclo não encontrado.");
    }
    return cycle;
  }

  private assertValidDateRange(startDate?: Date | null, endDate?: Date | null) {
    const hasStart = startDate !== null && startDate !== undefined;
    const hasEnd = endDate !== null && endDate !== undefined;
    if (hasStart !== hasEnd) {
      throw new ApiError(422, "invalid_date_range", "Informe as duas datas (início e fim) ou nenhuma.");
    }
    if (hasStart && hasEnd && startDate! > endDate!) {
      throw new ApiError(422, "invalid_date_range", "A data de início precisa ser anterior à data de fim.");
    }
  }

  async dateCheck(project: Project, startDate: Date, endDate: Date, excludeCycleId?: string): Promise<boolean> {
    const qb = Cycle.getRepository()
      .createQueryBuilder("c")
      .where("c.projectId = :projectId", { projectId: project.id })
      .andWhere("c.startDate IS NOT NULL")
      .andWhere("c.endDate IS NOT NULL")
      .andWhere("c.startDate <= :endDate AND c.endDate >= :startDate", { startDate, endDate });
    if (excludeCycleId) qb.andWhere("c.id != :excludeCycleId", { excludeCycleId });
    const overlap = await qb.getOne();
    return !overlap;
  }

  async create(
    project: Project,
    actor: User,
    input: { name: string; description?: string; startDate?: Date | null; endDate?: Date | null },
  ) {
    this.assertValidDateRange(input.startDate, input.endDate);

    const maxSequence = await Cycle.getRepository()
      .createQueryBuilder("c")
      .select("MIN(c.sortOrder)", "min")
      .where("c.projectId = :projectId", { projectId: project.id })
      .getRawOne<{ min: number | null }>();

    const cycle = Cycle.create({
      workspaceId: project.workspaceId,
      projectId: project.id,
      name: input.name,
      description: input.description ?? "",
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      ownedById: actor.id,
      sortOrder: (maxSequence?.min ?? 0) - 10000,
    });
    await cycle.save();
    return cycle;
  }

  private assertEditable(cycle: Cycle) {
    if (cycle.archivedAt) {
      throw new ApiError(422, "cycle_archived", "Desarquive o ciclo antes de editá-lo.");
    }
    if (cycle.endDate && cycle.endDate < new Date()) {
      throw new ApiError(422, "cycle_closed", "Este ciclo já terminou e não pode mais ser editado.");
    }
  }

  async update(
    cycle: Cycle,
    input: { name?: string; description?: string; startDate?: Date | null; endDate?: Date | null; sortOrder?: number },
  ) {
    const onlyReordering = Object.keys(input).every((k) => k === "sortOrder");
    if (!onlyReordering) this.assertEditable(cycle);

    if (input.startDate !== undefined || input.endDate !== undefined) {
      this.assertValidDateRange(
        input.startDate !== undefined ? input.startDate : cycle.startDate,
        input.endDate !== undefined ? input.endDate : cycle.endDate,
      );
    }
    Object.assign(cycle, input);
    await cycle.save();
    return cycle;
  }

  async remove(project: Project, cycle: Cycle, actor: User, isWorkspaceAdmin: boolean, actorProjectRole: WorkspaceRole) {
    const isCreator = cycle.ownedById === actor.id;
    if (!isWorkspaceAdmin && actorProjectRole < WorkspaceRole.ADMIN && !isCreator) {
      throw new ApiError(403, "insufficient_role", "Apenas Admin ou o criador do ciclo pode excluí-lo.");
    }
    await AppDataSource.transaction(async (manager) => {
      await manager.softDelete(Cycle, cycle.id);
      await manager.delete(Favorite, { entityType: "cycle", entityId: cycle.id });
    });
  }

  async archive(cycle: Cycle) {
    if (!cycle.endDate || cycle.endDate > new Date()) {
      throw new ApiError(422, "cycle_not_completed", "Só é possível arquivar ciclos já concluídos (data de fim no passado).");
    }
    cycle.archivedAt = new Date();
    await cycle.save();
    await Favorite.getRepository().delete({ entityType: "cycle", entityId: cycle.id });
    return cycle;
  }

  async unarchive(cycle: Cycle) {
    cycle.archivedAt = null;
    await cycle.save();
    return cycle;
  }

  async listArchived(projectId: string) {
    return Cycle.getRepository()
      .createQueryBuilder("c")
      .withDeleted()
      .where("c.projectId = :projectId", { projectId })
      .andWhere("c.archivedAt IS NOT NULL")
      .getMany();
  }

  // ---- Issues do ciclo ----

  async listIssues(cycleId: string) {
    const rows = await CycleIssue.find({ where: { cycleId }, relations: { issue: true } });
    return rows.map((r) => r.issue);
  }

  /** Bulk-add: se a issue já pertence a outro cycle, "move" a linha (não duplica). */
  async addIssues(project: Project, cycle: Cycle, issueIds: string[]): Promise<void> {
    if (cycle.endDate && cycle.endDate < new Date()) {
      throw new ApiError(422, "cycle_closed", "Não é possível adicionar issues a um ciclo já concluído.");
    }
    await AppDataSource.transaction(async (manager) => {
      for (const issueId of issueIds) {
        const issue = await manager.findOne(Issue, { where: { id: issueId, projectId: project.id } });
        if (!issue) continue;

        const existing = await manager.findOne(CycleIssue, { where: { issueId } });
        if (existing) {
          existing.cycleId = cycle.id;
          await manager.save(existing);
        } else {
          await manager.save(manager.create(CycleIssue, { cycleId: cycle.id, issueId }));
        }
      }
    });
  }

  async removeIssue(cycleId: string, issueId: string): Promise<void> {
    await CycleIssue.getRepository().softDelete({ cycleId, issueId });
  }

  /** Transfere issues não-completadas para outro ciclo, congelando um snapshot do ciclo atual antes. */
  async transferIssues(project: Project, cycle: Cycle, targetCycle: Cycle): Promise<void> {
    if (targetCycle.endDate && targetCycle.endDate < new Date()) {
      throw new ApiError(422, "target_cycle_closed", "Não é possível transferir issues para um ciclo já concluído.");
    }

    const snapshot = await this.computeProgress(cycle.id);
    cycle.progressSnapshot = snapshot;
    await cycle.save();

    const rows = await CycleIssue.find({ where: { cycleId: cycle.id }, relations: { issue: true } });
    const states = await State.find({ where: { projectId: project.id } });
    const stateById = new Map(states.map((s) => [s.id, s]));

    await AppDataSource.transaction(async (manager) => {
      for (const row of rows) {
        const state = row.issue.stateId ? stateById.get(row.issue.stateId) : undefined;
        const group = state?.group;
        if (group === "completed" || group === "cancelled") continue; // fica no ciclo antigo
        row.cycleId = targetCycle.id;
        await manager.save(row);
      }
    });
  }

  // ---- Progresso / analytics ----

  async computeProgress(cycleId: string): Promise<Record<string, unknown>> {
    const rows = await CycleIssue.getRepository()
      .createQueryBuilder("ci")
      .innerJoin("issues", "i", "i.id = ci.issueId")
      .leftJoin("states", "s", "s.id = i.stateId")
      .select("s.group", "group")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(i.point), 0)", "points")
      .where("ci.cycleId = :cycleId", { cycleId })
      .andWhere("ci.deletedAt IS NULL")
      .groupBy("s.group")
      .getRawMany<{ group: string | null; count: string; points: string }>();

    const distribution: Record<string, { count: number; points: number }> = {
      backlog: { count: 0, points: 0 },
      unstarted: { count: 0, points: 0 },
      started: { count: 0, points: 0 },
      completed: { count: 0, points: 0 },
      cancelled: { count: 0, points: 0 },
    };
    for (const row of rows) {
      if (row.group && row.group in distribution) {
        distribution[row.group] = { count: Number(row.count), points: Number(row.points) };
      }
    }
    return { stateDistribution: distribution, computedAt: new Date().toISOString() };
  }

  async getProgress(cycle: Cycle): Promise<Record<string, unknown>> {
    if (cycle.progressSnapshot && Object.keys(cycle.progressSnapshot).length > 0) {
      return cycle.progressSnapshot;
    }
    return this.computeProgress(cycle.id);
  }

  async getAnalytics(cycle: Cycle) {
    const byAssignee = await CycleIssue.getRepository()
      .createQueryBuilder("ci")
      .innerJoin("issue_assignees", "ia", `ia."issueId" = ci."issueId" AND ia."deletedAt" IS NULL`)
      .select("ia.assigneeId", "assigneeId")
      .addSelect("COUNT(*)", "count")
      .where("ci.cycleId = :cycleId", { cycleId: cycle.id })
      .andWhere("ci.deletedAt IS NULL")
      .groupBy("ia.assigneeId")
      .getRawMany<{ assigneeId: string; count: string }>();

    const byLabel = await CycleIssue.getRepository()
      .createQueryBuilder("ci")
      .innerJoin("issue_labels", "il", `il."issueId" = ci."issueId" AND il."deletedAt" IS NULL`)
      .select("il.labelId", "labelId")
      .addSelect("COUNT(*)", "count")
      .where("ci.cycleId = :cycleId", { cycleId: cycle.id })
      .andWhere("ci.deletedAt IS NULL")
      .groupBy("il.labelId")
      .getRawMany<{ labelId: string; count: string }>();

    return {
      byAssignee: byAssignee.map((r) => ({ assigneeId: r.assigneeId, count: Number(r.count) })),
      byLabel: byLabel.map((r) => ({ labelId: r.labelId, count: Number(r.count) })),
    };
  }
}

export const cycleService = new CycleService();
