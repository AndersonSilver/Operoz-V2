import { DraftIssue } from "../../entities/draft-issue.entity.js";
import { Issue } from "../../entities/issue.entity.js";
import { IssueAssignee } from "../../entities/issue-assignee.entity.js";
import { IssueLabel } from "../../entities/issue-label.entity.js";
import { State } from "../../entities/state.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { AppDataSource } from "../../config/data-source.js";
import { ApiError } from "../../common/api-error.js";
import { nextSequenceId } from "./issue-sequence.js";
import { logIssueActivity } from "./issue-activity.service.js";
import type { IssuePriority } from "../../entities/issue.entity.js";

interface DraftWriteInput {
  name?: string | null;
  descriptionJson?: Record<string, unknown>;
  descriptionHtml?: string;
  priority?: IssuePriority;
  stateId?: string | null;
  estimatePointId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  parentId?: string | null;
  assigneeIds?: string[];
  labelIds?: string[];
}

class DraftIssueService {
  async listMine(workspaceId: string, userId: string) {
    return DraftIssue.find({ where: { workspaceId, createdById: userId }, order: { createdAt: "DESC" } });
  }

  async findOrThrow(workspaceId: string, userId: string, draftId: string): Promise<DraftIssue> {
    const draft = await DraftIssue.findOne({ where: { id: draftId, workspaceId, createdById: userId } });
    if (!draft) {
      throw new ApiError(404, "draft_issue_not_found", "Rascunho não encontrado.");
    }
    return draft;
  }

  async create(project: Project, actor: User, input: DraftWriteInput): Promise<DraftIssue> {
    const draft = DraftIssue.create({
      workspaceId: project.workspaceId,
      projectId: project.id,
      createdById: actor.id,
      name: input.name ?? null,
      descriptionJson: input.descriptionJson ?? {},
      descriptionHtml: input.descriptionHtml ?? "<p></p>",
      priority: input.priority ?? "none",
      stateId: input.stateId ?? null,
      estimatePointId: input.estimatePointId ?? null,
      startDate: input.startDate ?? null,
      targetDate: input.targetDate ?? null,
      parentId: input.parentId ?? null,
      assigneeIds: input.assigneeIds ?? [],
      labelIds: input.labelIds ?? [],
    });
    await draft.save();
    return draft;
  }

  async update(draft: DraftIssue, input: DraftWriteInput): Promise<DraftIssue> {
    Object.assign(draft, input);
    await draft.save();
    return draft;
  }

  async remove(draft: DraftIssue): Promise<void> {
    await draft.remove();
  }

  /** Publica o rascunho como Issue real: gera `sequenceId`, migra assignees/labels, apaga o draft. */
  async publish(project: Project, draft: DraftIssue, actor: User): Promise<Issue> {
    if (!draft.name || draft.name.trim().length === 0) {
      throw new ApiError(422, "draft_missing_name", "O rascunho precisa de um título antes de ser publicado.");
    }

    let state = draft.stateId ? await State.findOne({ where: { id: draft.stateId, projectId: project.id } }) : null;
    if (!state) {
      state = project.defaultStateId
        ? await State.findOne({ where: { id: project.defaultStateId, projectId: project.id } })
        : null;
    }
    if (!state) {
      state = await State.findOne({ where: { projectId: project.id, isTriage: false } });
    }
    if (!state) {
      throw new ApiError(422, "no_valid_state", "O projeto não tem nenhum estado válido para atribuir.");
    }

    const issueId = await AppDataSource.transaction(async (manager) => {
      const sequenceId = await nextSequenceId(manager, project.id);
      const sortOrderResult = await manager
        .createQueryBuilder(Issue, "i")
        .select("MAX(i.sortOrder)", "max")
        .where("i.projectId = :projectId", { projectId: project.id })
        .andWhere("i.stateId = :stateId", { stateId: state!.id })
        .getRawOne<{ max: number | null }>();

      const issue = manager.create(Issue, {
        workspaceId: project.workspaceId,
        projectId: project.id,
        name: draft.name!,
        descriptionJson: draft.descriptionJson,
        descriptionHtml: draft.descriptionHtml,
        priority: draft.priority,
        stateId: state!.id,
        estimatePointId: draft.estimatePointId,
        startDate: draft.startDate,
        targetDate: draft.targetDate,
        parentId: draft.parentId,
        sequenceId,
        sortOrder: (sortOrderResult?.max ?? 0) + 10000,
        completedAt: state!.group === "completed" ? new Date() : null,
        createdById: actor.id,
      });
      await manager.save(issue);

      for (const assigneeId of draft.assigneeIds) {
        await manager.save(manager.create(IssueAssignee, { issueId: issue.id, assigneeId }));
      }
      for (const labelId of draft.labelIds) {
        await manager.save(manager.create(IssueLabel, { issueId: issue.id, labelId }));
      }

      await logIssueActivity(manager, {
        issueId: issue.id,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "created",
        field: "draft_published",
      });

      await manager.remove(draft);
      return issue.id;
    });

    const issue = await Issue.findOneBy({ id: issueId });
    if (!issue) {
      throw new ApiError(500, "internal_error", "Falha ao publicar rascunho.");
    }
    return issue;
  }
}

export const draftIssueService = new DraftIssueService();
