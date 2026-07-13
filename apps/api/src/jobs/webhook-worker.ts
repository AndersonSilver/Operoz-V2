import { createHmac } from "node:crypto";
import { Worker, type Job } from "bullmq";
import { jobsConnection } from "./connection.js";
import { WEBHOOK_QUEUE, type WebhookDeliverJobData } from "./queues.js";
import { Webhook } from "../entities/webhook.entity.js";
import { WebhookLog } from "../entities/webhook-log.entity.js";
import { User } from "../entities/user.entity.js";
import { decryptSecret } from "../common/crypto.js";
import { emailService } from "../common/email.service.js";
import { logger } from "../common/logger.js";

const MAX_CONSECUTIVE_FAILURES = 5;
const DELIVERY_TIMEOUT_MS = 10_000;

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

async function processDelivery(job: Job<WebhookDeliverJobData>): Promise<void> {
  const { webhookId, event, action, data } = job.data;

  const webhook = await Webhook.findOneBy({ id: webhookId });
  if (!webhook || !webhook.isActive) return;

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

  const maxAttempts = job.opts.attempts ?? 1;
  const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

  await WebhookLog.create({
    workspaceId: webhook.workspaceId,
    webhookId: webhook.id,
    eventType: event,
    requestBody: body,
    responseStatus,
    responseBody,
    retryCount: job.attemptsMade,
    success,
  }).save();

  if (success) {
    await Webhook.getRepository().update({ id: webhook.id }, { consecutiveFailures: 0 });
    return;
  }

  if (isFinalAttempt) {
    // `.increment()` faz um `UPDATE ... SET "consecutiveFailures" =
    // "consecutiveFailures" + 1` atômico no banco — necessário porque,
    // com `concurrency > 1`, entregas de eventos diferentes para o
    // mesmo webhook podem exaurir seus retries quase simultaneamente; um
    // read-modify-write em memória (`webhook.consecutiveFailures += 1;
    // save()`) perde incrementos concorrentes (confirmado em teste: 5
    // eventos falhos em paralelo resultaram em contador 1, não 5).
    await Webhook.getRepository().increment({ id: webhook.id }, "consecutiveFailures", 1);
    const fresh = await Webhook.findOneByOrFail({ id: webhook.id });
    if (fresh.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && fresh.isActive) {
      fresh.isActive = false;
      await fresh.save();
      if (fresh.createdById) {
        const owner = await User.findOneBy({ id: fresh.createdById });
        if (owner) {
          await emailService
            .send({
              to: owner.email,
              subject: "Webhook desativado automaticamente — Operoz",
              html: `<p>Seu webhook para <code>${fresh.url}</code> falhou ${MAX_CONSECUTIVE_FAILURES} vezes seguidas (com retry) e foi desativado automaticamente. Reative-o em Configurações do Workspace &gt; Webhooks depois de corrigir o endpoint.</p>`,
            })
            .catch(() => undefined);
        }
      }
    }
  }

  // Relança sempre que não teve sucesso: se ainda houver tentativas no
  // orçamento, o BullMQ agenda o próximo retry com backoff exponencial;
  // na última, ele marca o job como "failed" (efeitos colaterais acima
  // já tratados antes de relançar).
  throw new Error(responseBody ?? "webhook_delivery_failed");
}

export function createWebhookWorker(): Worker<WebhookDeliverJobData> {
  const worker = new Worker<WebhookDeliverJobData>(WEBHOOK_QUEUE, processDelivery, {
    connection: jobsConnection,
    concurrency: 10,
  });

  worker.on("error", (err) => logger.error({ err }, "Erro no worker de webhook"));

  return worker;
}
