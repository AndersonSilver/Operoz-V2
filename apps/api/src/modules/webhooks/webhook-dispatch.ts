import { createHmac } from "node:crypto";
import { Webhook } from "../../entities/webhook.entity.js";
import { WebhookLog } from "../../entities/webhook-log.entity.js";
import { User } from "../../entities/user.entity.js";
import { decryptSecret } from "../../common/crypto.js";
import { emailService } from "../../common/email.service.js";
import { logger } from "../../common/logger.js";

export type WebhookEventCategory = "project" | "issue" | "module" | "cycle" | "issue_comment";
export type WebhookAction = "created" | "updated" | "deleted";

const EVENT_FLAG_COLUMN: Record<WebhookEventCategory, keyof Webhook> = {
  project: "eventProject",
  issue: "eventIssue",
  module: "eventModule",
  cycle: "eventCycle",
  issue_comment: "eventIssueComment",
};

const MAX_CONSECUTIVE_FAILURES = 5;
const DELIVERY_TIMEOUT_MS = 10_000;

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Dispara (fire-and-forget) para todos os webhooks ativos do workspace
 * inscritos nesta categoria de evento. Simplificação consciente vs. o
 * original: uma única tentativa síncrona por chamada, sem fila de retry
 * com backoff de minutos/horas (exigiria infraestrutura de job queue que
 * este backend ainda não tem) — mas mantemos a regra de desativação
 * automática após falhas consecutivas, agora contadas por chamada em
 * vez de por retry dentro da mesma entrega.
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

    for (const webhook of webhooks) {
      void deliverOne(webhook, event, action, data);
    }
  } catch (err) {
    logger.error({ err, workspaceId, event }, "Falha ao resolver webhooks para disparo");
  }
}

async function deliverOne(
  webhook: Webhook,
  event: WebhookEventCategory,
  action: WebhookAction,
  data: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({ event, action, data, webhookId: webhook.id, workspaceId: webhook.workspaceId });
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const secret = decryptSecret(webhook.secretEncrypted);
    const signature = signPayload(secret, body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-operoz-signature": signature },
        body,
        signal: controller.signal,
      });
      responseStatus = response.status;
      responseBody = (await response.text()).slice(0, 5000);
      success = response.ok;
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    responseBody = err instanceof Error ? err.message : "unknown_error";
  }

  await WebhookLog.create({
    workspaceId: webhook.workspaceId,
    webhookId: webhook.id,
    eventType: event,
    requestBody: body,
    responseStatus,
    responseBody,
    success,
  }).save();

  webhook.consecutiveFailures = success ? 0 : webhook.consecutiveFailures + 1;
  if (webhook.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    webhook.isActive = false;
    await webhook.save();
    if (webhook.createdById) {
      const owner = await User.findOneBy({ id: webhook.createdById });
      if (owner) {
        await emailService
          .send({
            to: owner.email,
            subject: "Webhook desativado automaticamente — Operoz",
            html: `<p>Seu webhook para <code>${webhook.url}</code> falhou ${MAX_CONSECUTIVE_FAILURES} vezes seguidas e foi desativado automaticamente. Reative-o em Configurações do Workspace &gt; Webhooks depois de corrigir o endpoint.</p>`,
          })
          .catch(() => undefined);
      }
    }
  } else {
    await webhook.save();
  }
}
