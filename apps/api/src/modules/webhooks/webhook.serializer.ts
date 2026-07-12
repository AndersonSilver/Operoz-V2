import type { Webhook } from "../../entities/webhook.entity.js";

/** Nunca inclui o segredo — só existe na resposta de create/regenerate, à parte. */
export function serializeWebhook(webhook: Webhook) {
  return {
    id: webhook.id,
    url: webhook.url,
    isActive: webhook.isActive,
    eventProject: webhook.eventProject,
    eventIssue: webhook.eventIssue,
    eventModule: webhook.eventModule,
    eventCycle: webhook.eventCycle,
    eventIssueComment: webhook.eventIssueComment,
    consecutiveFailures: webhook.consecutiveFailures,
    createdAt: webhook.createdAt,
  };
}
