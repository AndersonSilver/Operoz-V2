import type { Issue } from "../../entities/issue.entity.js";

export function serializeIssue(issue: Issue, extra?: { assigneeIds?: string[]; labelIds?: string[] }) {
  return {
    id: issue.id,
    workspaceId: issue.workspaceId,
    projectId: issue.projectId,
    name: issue.name,
    descriptionJson: issue.descriptionJson,
    descriptionHtml: issue.descriptionHtml,
    priority: issue.priority,
    stateId: issue.stateId,
    point: issue.point,
    estimatePointId: issue.estimatePointId,
    startDate: issue.startDate,
    targetDate: issue.targetDate,
    sequenceId: issue.sequenceId,
    sortOrder: issue.sortOrder,
    completedAt: issue.completedAt,
    archivedAt: issue.archivedAt,
    parentId: issue.parentId,
    createdById: issue.createdById,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    assigneeIds: extra?.assigneeIds ?? [],
    labelIds: extra?.labelIds ?? [],
  };
}
