import type { EntityManager } from "typeorm";
import { IssueActivity } from "../../entities/issue-activity.entity.js";
import { Issue } from "../../entities/issue.entity.js";
import { IssueAssignee } from "../../entities/issue-assignee.entity.js";
import { IssueSubscriber } from "../../entities/issue-subscriber.entity.js";
import { User } from "../../entities/user.entity.js";
import { notificationService, type NotificationPreferenceKey } from "../notifications/notification.service.js";
import { dispatchWebhookEvent, type WebhookAction } from "../webhooks/webhook-dispatch.js";

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

/**
 * Sem "criada" nem "excluída": criação de issue não faz parte do escopo
 * central de preferências (equivalente ao `issue_created_alert` do motor
 * de regras de alerta, fora de escopo aqui); notificar sobre algo que
 * acabou de ser apagado não faz sentido.
 */
function classifyNotificationType(verb: string, field: string | null): NotificationPreferenceKey | null {
  if (verb === "created" || verb === "deleted") return null;
  if (verb === "commented") return "comment";
  if (field === "comment") return "comment";
  if (field === "stateId") return "stateChange";
  if (field) return "propertyChange";
  return null;
}

/** Grava uma linha de auditoria e, quando aplicável, dispara notificações para assignees/criador/subscribers. */
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

  if (input.issueId) {
    const action: WebhookAction =
      input.verb === "created" ? "created" : input.verb === "deleted" ? "deleted" : "updated";
    const category = input.verb === "commented" || input.field === "comment" ? "issue_comment" : "issue";
    void dispatchWebhookEvent(input.workspaceId, category, action, {
      issueId: input.issueId,
      projectId: input.projectId,
      field: input.field ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    });
  }

  if (!input.issueId) return;
  const preferenceKey = classifyNotificationType(input.verb, input.field ?? null);
  if (!preferenceKey) return;

  const issue = await manager.findOne(Issue, { where: { id: input.issueId } });
  if (!issue) return;

  const [assignees, subscribers, actor] = await Promise.all([
    manager.find(IssueAssignee, { where: { issueId: issue.id } }),
    manager.find(IssueSubscriber, { where: { issueId: issue.id } }),
    input.actorId ? manager.findOne(User, { where: { id: input.actorId } }) : Promise.resolve(null),
  ]);
  const receiverIds = [
    ...assignees.map((a) => a.assigneeId),
    ...subscribers.map((s) => s.subscriberId),
    ...(issue.createdById ? [issue.createdById] : []),
  ];

  await notificationService.notify(manager, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    entityType: "issue",
    entityIdentifier: issue.id,
    title: `${issue.name}`,
    messageHtml: `<p>${actor?.fullName ?? "Alguém"} ${verbLabel(input.verb, input.field)} em "${issue.name}"</p>`,
    sender: actor?.fullName ?? "Sistema",
    triggeredById: input.actorId,
    receiverIds,
    preferenceKey,
  });
}

function verbLabel(verb: string, field?: string | null): string {
  if (verb === "commented") return "comentou";
  if (field === "stateId") return "mudou o status";
  if (field) return `atualizou ${field}`;
  return "fez uma alteração";
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
