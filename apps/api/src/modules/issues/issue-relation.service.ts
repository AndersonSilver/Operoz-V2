import { IssueRelation, type IssueRelationType } from "../../entities/issue-relation.entity.js";
import { Issue } from "../../entities/issue.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { logIssueActivity } from "./issue-activity.service.js";
import { AppDataSource } from "../../config/data-source.js";

type DisplayType = IssueRelationType | "blocking" | "start_after" | "finish_after" | "implements";

const ALIASES: Record<string, { canonical: IssueRelationType; swap: boolean }> = {
  blocked_by: { canonical: "blocked_by", swap: false },
  blocking: { canonical: "blocked_by", swap: true },
  relates_to: { canonical: "relates_to", swap: false },
  duplicate: { canonical: "duplicate", swap: false },
  start_before: { canonical: "start_before", swap: false },
  start_after: { canonical: "start_before", swap: true },
  finish_before: { canonical: "finish_before", swap: false },
  finish_after: { canonical: "finish_before", swap: true },
  implemented_by: { canonical: "implemented_by", swap: false },
  implements: { canonical: "implemented_by", swap: true },
};

/** Rótulo exibido quando a issue consultada é o lado `relatedIssue` da linha persistida (nunca gravado, só calculado). */
const INVERSE_LABEL: Record<IssueRelationType, DisplayType> = {
  blocked_by: "blocking",
  relates_to: "relates_to",
  duplicate: "duplicate",
  start_before: "start_after",
  finish_before: "finish_after",
  implemented_by: "implements",
};

class IssueRelationService {
  async create(
    project: Project,
    actor: User,
    issueId: string,
    input: { relatedIssueId: string; relationType: string },
  ): Promise<IssueRelation> {
    const alias = ALIASES[input.relationType];
    if (!alias) {
      throw new ApiError(422, "invalid_relation_type", "Tipo de relação inválido.");
    }

    let fromId = issueId;
    let toId = input.relatedIssueId;
    if (alias.swap) [fromId, toId] = [toId, fromId];

    if (fromId === toId) {
      throw new ApiError(422, "cannot_relate_to_self", "Uma issue não pode se relacionar consigo mesma.");
    }

    const target = await Issue.findOne({ where: { id: toId, workspaceId: project.workspaceId } });
    if (!target) {
      throw new ApiError(422, "invalid_related_issue", "A issue relacionada não existe neste workspace.");
    }

    if (alias.canonical === "blocked_by") {
      await this.assertNoBlockCycle(fromId, toId);
    }

    const existing = await IssueRelation.findOne({ where: { issueId: fromId, relatedIssueId: toId } });
    if (existing) {
      throw new ApiError(409, "relation_already_exists", "Essa relação já existe entre essas issues.");
    }

    const relation = IssueRelation.create({ issueId: fromId, relatedIssueId: toId, relationType: alias.canonical });
    await relation.save();

    await AppDataSource.transaction(async (manager) => {
      await logIssueActivity(manager, {
        issueId: fromId,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "updated",
        field: "relation",
        newValue: alias.canonical,
        newIdentifier: toId,
      });
    });

    return relation;
  }

  /** Detecta ciclo no grafo dirigido de `blocked_by` (ausente no sistema original — correção consciente). */
  private async assertNoBlockCycle(fromId: string, toId: string): Promise<void> {
    const visited = new Set<string>();
    let frontier = [toId];
    let guard = 0;
    while (frontier.length > 0 && guard < 500) {
      const rows = await IssueRelation.find({
        where: frontier.map((id) => ({ issueId: id, relationType: "blocked_by" as const })),
      });
      const next: string[] = [];
      for (const row of rows) {
        if (row.relatedIssueId === fromId) {
          throw new ApiError(422, "relation_cycle", "Essa relação criaria um ciclo de bloqueio entre issues.");
        }
        if (!visited.has(row.relatedIssueId)) {
          visited.add(row.relatedIssueId);
          next.push(row.relatedIssueId);
        }
      }
      frontier = next;
      guard += 1;
    }
  }

  async listForIssue(issueId: string): Promise<Record<DisplayType, Array<{ issueId: string; projectId: string }>>> {
    const grouped: Record<string, Array<{ issueId: string; projectId: string }>> = {
      blocked_by: [],
      blocking: [],
      relates_to: [],
      duplicate: [],
      start_before: [],
      start_after: [],
      finish_before: [],
      finish_after: [],
      implemented_by: [],
      implements: [],
    };

    const asSource = await IssueRelation.find({ where: { issueId }, relations: { relatedIssue: true } });
    for (const rel of asSource) {
      grouped[rel.relationType]!.push({ issueId: rel.relatedIssueId, projectId: rel.relatedIssue.projectId });
    }

    const asTarget = await IssueRelation.find({ where: { relatedIssueId: issueId }, relations: { issue: true } });
    for (const rel of asTarget) {
      const label = INVERSE_LABEL[rel.relationType];
      grouped[label]!.push({ issueId: rel.issueId, projectId: rel.issue.projectId });
    }

    return grouped as Record<DisplayType, Array<{ issueId: string; projectId: string }>>;
  }

  async remove(issueId: string, relationId: string): Promise<void> {
    const relation = await IssueRelation.findOne({
      where: [
        { id: relationId, issueId },
        { id: relationId, relatedIssueId: issueId },
      ],
    });
    if (!relation) {
      throw new ApiError(404, "relation_not_found", "Relação não encontrada.");
    }
    await relation.remove();
  }
}

export const issueRelationService = new IssueRelationService();
