import { Issue, type IssuePriority } from "../../entities/issue.entity.js";
import { IssueActivity } from "../../entities/issue-activity.entity.js";
import { IssueAssignee } from "../../entities/issue-assignee.entity.js";
import { IssueLabel } from "../../entities/issue-label.entity.js";
import { State } from "../../entities/state.entity.js";
import { Label } from "../../entities/label.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { AppDataSource } from "../../config/data-source.js";
import { ApiError } from "../../common/api-error.js";
import { nextSequenceId } from "./issue-sequence.js";
import { logFieldDiffs, logIssueActivity } from "./issue-activity.service.js";
import { syncIssueMentions } from "./mention-sync.js";
import { subscriberService } from "./subscriber.service.js";

interface IssueWriteInput {
  name?: string;
  descriptionJson?: Record<string, unknown>;
  descriptionHtml?: string;
  priority?: IssuePriority;
  stateId?: string;
  point?: number | null;
  estimatePointId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  parentId?: string | null;
  assigneeIds?: string[];
  labelIds?: string[];
}

interface ListFilters {
  stateId?: string;
  stateGroup?: string;
  priority?: IssuePriority;
  assigneeId?: string;
  labelId?: string;
  createdById?: string;
  parentId?: string;
  isArchived?: boolean;
}

class IssueService {
  async list(project: Project, filters: ListFilters) {
    const qb = Issue.getRepository()
      .createQueryBuilder("i")
      .leftJoin("states", "s", "s.id = i.stateId")
      .where("i.projectId = :projectId", { projectId: project.id });

    qb.andWhere(filters.isArchived ? "i.archivedAt IS NOT NULL" : "i.archivedAt IS NULL");

    if (filters.stateId) qb.andWhere("i.stateId = :stateId", { stateId: filters.stateId });
    if (filters.stateGroup) qb.andWhere("s.group = :stateGroup", { stateGroup: filters.stateGroup });
    if (filters.priority) qb.andWhere("i.priority = :priority", { priority: filters.priority });
    if (filters.createdById) qb.andWhere("i.createdById = :createdById", { createdById: filters.createdById });
    if (filters.parentId) qb.andWhere("i.parentId = :parentId", { parentId: filters.parentId });

    if (filters.assigneeId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM issue_assignees ia WHERE ia."issueId" = i.id AND ia."assigneeId" = :assigneeId AND ia."deletedAt" IS NULL)`,
        { assigneeId: filters.assigneeId },
      );
    }
    if (filters.labelId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM issue_labels il WHERE il."issueId" = i.id AND il."labelId" = :labelId AND il."deletedAt" IS NULL)`,
        { labelId: filters.labelId },
      );
    }

    qb.orderBy("i.sortOrder", "ASC").addOrderBy("i.createdAt", "DESC");
    return qb.getMany();
  }

  async findOrThrow(projectId: string, issueId: string): Promise<Issue> {
    const issue = await Issue.findOne({ where: { id: issueId, projectId } });
    if (!issue) {
      throw new ApiError(404, "issue_not_found", "Issue não encontrada.");
    }
    return issue;
  }

  async getAssigneeIds(issueId: string): Promise<string[]> {
    const rows = await IssueAssignee.find({ where: { issueId } });
    return rows.map((r) => r.assigneeId);
  }

  async getLabelIds(issueId: string): Promise<string[]> {
    const rows = await IssueLabel.find({ where: { issueId } });
    return rows.map((r) => r.labelId);
  }

  private async resolveDefaultState(project: Project): Promise<State> {
    if (project.defaultStateId) {
      const state = await State.findOne({ where: { id: project.defaultStateId, projectId: project.id } });
      if (state) return state;
    }
    const fallback = await State.findOne({ where: { projectId: project.id, isTriage: false } });
    if (!fallback) {
      throw new ApiError(422, "no_valid_state", "O projeto não tem nenhum estado válido para atribuir.");
    }
    return fallback;
  }

  private async assertStateInProject(projectId: string, stateId: string): Promise<State> {
    const state = await State.findOne({ where: { id: stateId, projectId } });
    if (!state) {
      throw new ApiError(422, "invalid_state", "O estado informado não pertence a este projeto.");
    }
    return state;
  }

  private async assertLabelsInProject(projectId: string, labelIds: string[]): Promise<void> {
    if (labelIds.length === 0) return;
    const count = await Label.getRepository()
      .createQueryBuilder("l")
      .where("l.id IN (:...ids)", { ids: labelIds })
      .andWhere("l.projectId = :projectId", { projectId })
      .getCount();
    if (count !== labelIds.length) {
      throw new ApiError(422, "invalid_label", "Uma ou mais labels não pertencem a este projeto.");
    }
  }

  private async assertUsersExist(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const count = await User.getRepository().createQueryBuilder("u").where("u.id IN (:...ids)", { ids: userIds }).getCount();
    if (count !== userIds.length) {
      throw new ApiError(422, "invalid_assignee", "Um ou mais usuários informados não existem.");
    }
  }

  private async assertNoParentCycle(projectId: string, issueId: string | null, parentId: string): Promise<void> {
    const parent = await Issue.findOne({ where: { id: parentId, projectId } });
    if (!parent) {
      throw new ApiError(422, "invalid_parent", "A issue-pai precisa pertencer ao mesmo projeto.");
    }
    if (issueId && parentId === issueId) {
      throw new ApiError(422, "parent_cycle", "Uma issue não pode ser pai de si mesma.");
    }
    if (!issueId) return;

    let current: string | null = parent.parentId;
    let guard = 0;
    while (current && guard < 200) {
      if (current === issueId) {
        throw new ApiError(422, "parent_cycle", "Essa alteração criaria um ciclo de hierarquia entre issues.");
      }
      const ancestor: Issue | null = await Issue.findOne({ where: { id: current } });
      current = ancestor?.parentId ?? null;
      guard += 1;
    }
  }

  private nextCompletedAt(state: State): Date | null {
    return state.group === "completed" ? new Date() : null;
  }

  private async computeSortOrder(projectId: string, stateId: string): Promise<number> {
    const result = await Issue.getRepository()
      .createQueryBuilder("i")
      .select("MAX(i.sortOrder)", "max")
      .where("i.projectId = :projectId", { projectId })
      .andWhere("i.stateId = :stateId", { stateId })
      .getRawOne<{ max: number | null }>();
    return (result?.max ?? 0) + 10000;
  }

  async create(project: Project, actor: User, input: IssueWriteInput): Promise<Issue> {
    const state = input.stateId
      ? await this.assertStateInProject(project.id, input.stateId)
      : await this.resolveDefaultState(project);

    if (input.parentId) {
      await this.assertNoParentCycle(project.id, null, input.parentId);
    }
    const assigneeIds = input.assigneeIds ?? [];
    const labelIds = input.labelIds ?? [];
    await this.assertUsersExist(assigneeIds);
    await this.assertLabelsInProject(project.id, labelIds);

    const issueId = await AppDataSource.transaction(async (manager) => {
      const sequenceId = await nextSequenceId(manager, project.id);
      const sortOrder = await this.computeSortOrder(project.id, state.id);

      const issue = manager.create(Issue, {
        workspaceId: project.workspaceId,
        projectId: project.id,
        name: input.name!,
        descriptionJson: input.descriptionJson ?? {},
        descriptionHtml: input.descriptionHtml ?? "<p></p>",
        priority: input.priority ?? "none",
        stateId: state.id,
        point: input.point ?? null,
        estimatePointId: input.estimatePointId ?? null,
        startDate: input.startDate ?? null,
        targetDate: input.targetDate ?? null,
        parentId: input.parentId ?? null,
        sequenceId,
        sortOrder,
        completedAt: this.nextCompletedAt(state),
        createdById: actor.id,
      });
      await manager.save(issue);
      await syncIssueMentions(manager, issue.id, issue.descriptionJson, {
        workspaceId: project.workspaceId,
        projectId: project.id,
        actorId: actor.id,
        issueName: issue.name,
        senderName: actor.fullName,
      });

      for (const assigneeId of assigneeIds) {
        await manager.save(manager.create(IssueAssignee, { issueId: issue.id, assigneeId }));
      }
      for (const labelId of labelIds) {
        await manager.save(manager.create(IssueLabel, { issueId: issue.id, labelId }));
      }

      await logIssueActivity(manager, {
        issueId: issue.id,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "created",
      });

      return issue.id;
    });

    // Auto-subscribe do autor e dos assignees (best-effort, idempotente).
    await subscriberService.ensureSubscribed(issueId, actor.id);
    for (const assigneeId of assigneeIds) {
      await subscriberService.ensureSubscribed(issueId, assigneeId);
    }

    return this.findOrThrow(project.id, issueId);
  }

  async update(project: Project, issue: Issue, actor: User, input: IssueWriteInput): Promise<Issue> {
    let nextState: State | null = null;
    if (input.stateId && input.stateId !== issue.stateId) {
      nextState = await this.assertStateInProject(project.id, input.stateId);
    }
    if (input.parentId !== undefined && input.parentId !== issue.parentId) {
      if (input.parentId) await this.assertNoParentCycle(project.id, issue.id, input.parentId);
    }
    if (input.assigneeIds) await this.assertUsersExist(input.assigneeIds);
    if (input.labelIds) await this.assertLabelsInProject(project.id, input.labelIds);

    const before = {
      name: issue.name,
      priority: issue.priority,
      stateId: issue.stateId,
      point: issue.point,
      estimatePointId: issue.estimatePointId,
      startDate: issue.startDate,
      targetDate: issue.targetDate,
      parentId: issue.parentId,
    };

    await AppDataSource.transaction(async (manager) => {
      if (input.name !== undefined) issue.name = input.name;
      if (input.descriptionJson !== undefined) issue.descriptionJson = input.descriptionJson;
      if (input.descriptionHtml !== undefined) issue.descriptionHtml = input.descriptionHtml;
      if (input.priority !== undefined) issue.priority = input.priority;
      if (input.point !== undefined) issue.point = input.point;
      if (input.estimatePointId !== undefined) issue.estimatePointId = input.estimatePointId;
      if (input.startDate !== undefined) issue.startDate = input.startDate;
      if (input.targetDate !== undefined) issue.targetDate = input.targetDate;
      if (input.parentId !== undefined) issue.parentId = input.parentId;

      if (nextState) {
        issue.stateId = nextState.id;
        issue.completedAt = this.nextCompletedAt(nextState);
        issue.sortOrder = await this.computeSortOrder(project.id, nextState.id);
      }
      await manager.save(issue);
      if (input.descriptionJson !== undefined) {
        await syncIssueMentions(manager, issue.id, issue.descriptionJson, {
          workspaceId: project.workspaceId,
          projectId: project.id,
          actorId: actor.id,
          issueName: issue.name,
          senderName: actor.fullName,
        });
      }

      if (input.assigneeIds) {
        await manager.delete(IssueAssignee, { issueId: issue.id });
        for (const assigneeId of input.assigneeIds) {
          await manager.save(manager.create(IssueAssignee, { issueId: issue.id, assigneeId }));
        }
        await logIssueActivity(manager, {
          issueId: issue.id,
          projectId: project.id,
          workspaceId: project.workspaceId,
          actorId: actor.id,
          verb: "updated",
          field: "assignees",
        });
      }
      if (input.labelIds) {
        await manager.delete(IssueLabel, { issueId: issue.id });
        for (const labelId of input.labelIds) {
          await manager.save(manager.create(IssueLabel, { issueId: issue.id, labelId }));
        }
        await logIssueActivity(manager, {
          issueId: issue.id,
          projectId: project.id,
          workspaceId: project.workspaceId,
          actorId: actor.id,
          verb: "updated",
          field: "labels",
        });
      }

      const after = {
        name: issue.name,
        priority: issue.priority,
        stateId: issue.stateId,
        point: issue.point,
        estimatePointId: issue.estimatePointId,
        startDate: issue.startDate,
        targetDate: issue.targetDate,
        parentId: issue.parentId,
      };
      await logFieldDiffs(
        manager,
        { issueId: issue.id, projectId: project.id, workspaceId: project.workspaceId, actorId: actor.id },
        before,
        after,
      );
    });

    if (input.assigneeIds) {
      for (const assigneeId of input.assigneeIds) {
        await subscriberService.ensureSubscribed(issue.id, assigneeId);
      }
    }

    return this.findOrThrow(project.id, issue.id);
  }

  async remove(project: Project, issue: Issue, actor: User): Promise<void> {
    await AppDataSource.transaction(async (manager) => {
      await manager.softDelete(Issue, issue.id);
      await logIssueActivity(manager, {
        issueId: issue.id,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "deleted",
      });
    });
  }

  private assertArchivable(issue: Issue, state: State) {
    if (state.group !== "completed" && state.group !== "cancelled") {
      throw new ApiError(
        422,
        "cannot_archive_active_issue",
        `Só é possível arquivar issues nos estados "completed" ou "cancelled" (issue "${issue.name}" não está).`,
      );
    }
  }

  async archive(project: Project, issue: Issue): Promise<Issue> {
    const state = await State.findOneBy({ id: issue.stateId ?? "" });
    if (!state) throw new ApiError(422, "invalid_state", "Issue sem estado válido.");
    this.assertArchivable(issue, state);
    issue.archivedAt = new Date();
    await issue.save();
    return issue;
  }

  async unarchive(project: Project, issue: Issue): Promise<Issue> {
    issue.archivedAt = null;
    await issue.save();
    return issue;
  }

  async bulkUpdate(
    project: Project,
    actor: User,
    issueIds: string[],
    input: { stateId?: string; priority?: IssuePriority; estimatePointId?: string | null; assigneeIds?: string[]; labelIds?: string[] },
  ): Promise<void> {
    const issues = await Issue.find({ where: { projectId: project.id } });
    const targetIssues = issues.filter((i) => issueIds.includes(i.id));
    for (const issue of targetIssues) {
      await this.update(project, issue, actor, input);
    }
  }

  async bulkDelete(project: Project, actor: User, issueIds: string[]): Promise<void> {
    const issues = await Issue.find({ where: { projectId: project.id } });
    const targetIssues = issues.filter((i) => issueIds.includes(i.id));
    await AppDataSource.transaction(async (manager) => {
      for (const issue of targetIssues) {
        await manager.softDelete(Issue, issue.id);
        // Correção consciente: o original não loga activity em bulk-delete
        // (assimetria vs. delete individual) — aqui logamos sempre, é
        // mais seguro para auditoria.
        await logIssueActivity(manager, {
          issueId: issue.id,
          projectId: project.id,
          workspaceId: project.workspaceId,
          actorId: actor.id,
          verb: "deleted",
        });
      }
    });
  }

  async bulkArchive(project: Project, issueIds: string[]): Promise<void> {
    const issues = await Issue.find({ where: { projectId: project.id } });
    const targetIssues = issues.filter((i) => issueIds.includes(i.id));
    const states = await State.find({ where: { projectId: project.id } });
    const stateById = new Map(states.map((s) => [s.id, s]));

    // Tudo-ou-nada: valida o lote inteiro antes de aplicar qualquer mudança.
    for (const issue of targetIssues) {
      const state = issue.stateId ? stateById.get(issue.stateId) : undefined;
      if (!state) throw new ApiError(422, "invalid_state", "Issue sem estado válido.");
      this.assertArchivable(issue, state);
    }
    const now = new Date();
    for (const issue of targetIssues) {
      issue.archivedAt = now;
      await issue.save();
    }
  }

  async search(workspaceId: string, query: string) {
    const qb = Issue.getRepository()
      .createQueryBuilder("i")
      .where("i.workspaceId = :workspaceId", { workspaceId })
      .andWhere("i.deletedAt IS NULL");

    const asNumber = Number(query);
    if (!Number.isNaN(asNumber) && query.trim() !== "") {
      qb.andWhere("(i.name ILIKE :query OR i.sequenceId = :seq)", { query: `%${query}%`, seq: asNumber });
    } else {
      qb.andWhere("i.name ILIKE :query", { query: `%${query}%` });
    }
    return qb.orderBy("i.createdAt", "DESC").limit(50).getMany();
  }

  async lookupByKey(workspaceId: string, identifier: string, sequenceId: number): Promise<Issue> {
    const project = await Project.findOne({ where: { workspaceId, identifier: identifier.toUpperCase() } });
    if (!project) {
      throw new ApiError(404, "issue_not_found", "Issue não encontrada.");
    }
    const issue = await Issue.findOne({ where: { projectId: project.id, sequenceId } });
    if (!issue) {
      throw new ApiError(404, "issue_not_found", "Issue não encontrada.");
    }
    return issue;
  }

  async getActivityTimeline(issueId: string) {
    return IssueActivity.find({ where: { issueId }, order: { createdAt: "ASC" } });
  }

  async listByIds(project: Project, ids: string[]) {
    if (ids.length === 0) return [];
    return Issue.getRepository()
      .createQueryBuilder("i")
      .where("i.projectId = :projectId", { projectId: project.id })
      .andWhere("i.id IN (:...ids)", { ids })
      .getMany();
  }

  /** Filhos diretos (1 nível, não a árvore recursiva inteira) + contagem por grupo de estado. */
  async getSubIssues(project: Project, issueId: string) {
    const children = await Issue.find({ where: { parentId: issueId, projectId: project.id } });

    const rows = await Issue.getRepository()
      .createQueryBuilder("i")
      .leftJoin("states", "s", "s.id = i.stateId")
      .select("s.group", "group")
      .addSelect("COUNT(*)", "count")
      .where("i.parentId = :issueId", { issueId })
      .andWhere("i.projectId = :projectId", { projectId: project.id })
      .groupBy("s.group")
      .getRawMany<{ group: string | null; count: string }>();

    const stateDistribution: Record<string, number> = {
      backlog: 0,
      unstarted: 0,
      started: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of rows) {
      if (row.group && row.group in stateDistribution) stateDistribution[row.group] = Number(row.count);
    }

    return { subIssues: children, stateDistribution };
  }

  /** Atribui vários filhos de uma vez a um pai — cada item passa pela mesma validação de ciclo do update individual. */
  async bulkAssignParent(project: Project, actor: User, parentId: string, issueIds: string[]): Promise<void> {
    await this.findOrThrow(project.id, parentId);

    await AppDataSource.transaction(async (manager) => {
      for (const childId of issueIds) {
        if (childId === parentId) continue;
        const child = await manager.findOne(Issue, { where: { id: childId, projectId: project.id } });
        if (!child) continue; // fora do projeto: ignorado silenciosamente, não faz sentido bulk-assign cross-project

        await this.assertNoParentCycle(project.id, childId, parentId);

        const oldParentId = child.parentId;
        child.parentId = parentId;
        await manager.save(child);

        await logIssueActivity(manager, {
          issueId: child.id,
          projectId: project.id,
          workspaceId: project.workspaceId,
          actorId: actor.id,
          verb: "updated",
          field: "parentId",
          oldIdentifier: oldParentId,
          newIdentifier: parentId,
        });
      }
    });
  }
}

export const issueService = new IssueService();
