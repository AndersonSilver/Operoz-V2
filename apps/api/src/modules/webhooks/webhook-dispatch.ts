import { Webhook } from "../../entities/webhook.entity.js";
import { logger } from "../../common/logger.js";
import { webhookQueue } from "../../jobs/queues.js";

export type WebhookEventCategory = "project" | "issue" | "module" | "cycle" | "issue_comment";
export type WebhookAction = "created" | "updated" | "deleted";

const EVENT_FLAG_COLUMN: Record<WebhookEventCategory, keyof Webhook> = {
  project: "eventProject",
  issue: "eventIssue",
  module: "eventModule",
  cycle: "eventCycle",
  issue_comment: "eventIssueComment",
};

const DELIVERY_ATTEMPTS = 5;
const DELIVERY_BACKOFF_MS = 2_000;

/**
 * Resolve os webhooks ativos do workspace inscritos nesta categoria de
 * evento e enfileira uma entrega por webhook (fila `webhook-delivery`,
 * processada em `jobs/webhook-worker.ts`), com retry e backoff
 * exponencial reais — substitui a versão anterior, que fazia uma única
 * tentativa síncrona fire-and-forget por falta de infraestrutura de
 * fila (agora resolvida por este backend com BullMQ).
 */
export async function dispatchWebhookEvent(
  workspaceId: string,
  event: WebhookEventCategory,
  action: WebhookAction,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const flagColumn = EVENT_FLAG_COLUMN[event];
    const webhooks = await Webhook.find({ where: { workspaceId, isActive: true, [flagColumn]: true } as never });

    await Promise.all(
      webhooks.map((webhook) =>
        webhookQueue.add(
          "deliver",
          { webhookId: webhook.id, event, action, data },
          { attempts: DELIVERY_ATTEMPTS, backoff: { type: "exponential", delay: DELIVERY_BACKOFF_MS } },
        ),
      ),
    );
  } catch (err) {
    logger.error({ err, workspaceId, event }, "Falha ao enfileirar webhooks para disparo");
  }
}
