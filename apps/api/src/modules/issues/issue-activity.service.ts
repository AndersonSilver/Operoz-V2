import type { EntityManager } from "typeorm";
import { IssueActivity } from "../../entities/issue-activity.entity.js";

interface LogFieldChangeInput {
  issueId: string | null;
  projectId: string;
  workspaceId: string;
  actorId: string | null;
  verb: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  oldIdentifier?: string | null;
  newIdentifier?: string | null;
}

/** Grava uma linha de auditoria. Síncrono (dentro da mesma transação da escrita) — sem fila de background nesta reescrita. */
export async function logIssueActivity(manager: EntityManager, input: LogFieldChangeInput): Promise<void> {
  const activity = manager.create(IssueActivity, {
    issueId: input.issueId,
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    actorId: input.actorId,
    verb: input.verb,
    field: input.field ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    oldIdentifier: input.oldIdentifier ?? null,
    newIdentifier: input.newIdentifier ?? null,
  });
  await manager.save(activity);
}

type Scalar = string | number | boolean | null | undefined;

/** Compara campos escalares simples de antes/depois e grava uma linha por campo alterado. */
export async function logFieldDiffs(
  manager: EntityManager,
  ctx: { issueId: string; projectId: string; workspaceId: string; actorId: string | null },
  before: Record<string, Scalar>,
  after: Record<string, Scalar>,
): Promise<void> {
  for (const field of Object.keys(after)) {
    const oldValue = before[field];
    const newValue = after[field];
    if (oldValue === newValue) continue;
    await logIssueActivity(manager, {
      issueId: ctx.issueId,
      projectId: ctx.projectId,
      workspaceId: ctx.workspaceId,
      actorId: ctx.actorId,
      verb: "updated",
      field,
      oldValue: oldValue === null || oldValue === undefined ? null : String(oldValue),
      newValue: newValue === null || newValue === undefined ? null : String(newValue),
    });
  }
}
