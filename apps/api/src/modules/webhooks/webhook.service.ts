import { randomBytes } from "node:crypto";
import { Webhook } from "../../entities/webhook.entity.js";
import { WebhookLog } from "../../entities/webhook-log.entity.js";
import { Workspace } from "../../entities/workspace.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { encryptSecret } from "../../common/crypto.js";
import { assertSafeWebhookUrl } from "./webhook-url-validator.js";

interface WebhookWriteInput {
  url?: string;
  isActive?: boolean;
  eventProject?: boolean;
  eventIssue?: boolean;
  eventModule?: boolean;
  eventCycle?: boolean;
  eventIssueComment?: boolean;
}

class WebhookService {
  async list(workspaceId: string) {
    return Webhook.find({ where: { workspaceId }, order: { createdAt: "DESC" } });
  }

  async findOrThrow(workspaceId: string, webhookId: string): Promise<Webhook> {
    const webhook = await Webhook.findOne({ where: { id: webhookId, workspaceId } });
    if (!webhook) {
      throw new ApiError(404, "webhook_not_found", "Webhook não encontrado.");
    }
    return webhook;
  }

  /** Retorna `{ webhook, secret }` — o segredo em claro só existe aqui (criação) e no regenerate. */
  async create(
    workspace: Workspace,
    actor: User,
    input: { url: string } & Omit<WebhookWriteInput, "url">,
  ): Promise<{ webhook: Webhook; secret: string }> {
    await assertSafeWebhookUrl(input.url);

    const existing = await Webhook.findOne({ where: { workspaceId: workspace.id, url: input.url } });
    if (existing) {
      throw new ApiError(409, "webhook_url_taken", "Já existe um webhook com esta URL neste workspace.");
    }

    const secret = randomBytes(24).toString("hex");
    const webhook = Webhook.create({
      workspaceId: workspace.id,
      createdById: actor.id,
      url: input.url,
      secretEncrypted: encryptSecret(secret),
      isActive: input.isActive ?? true,
      eventProject: input.eventProject ?? true,
      eventIssue: input.eventIssue ?? true,
      eventModule: input.eventModule ?? true,
      eventCycle: input.eventCycle ?? true,
      eventIssueComment: input.eventIssueComment ?? true,
    });
    await webhook.save();
    return { webhook, secret };
  }

  async update(webhook: Webhook, input: WebhookWriteInput) {
    if (input.url && input.url !== webhook.url) {
      await assertSafeWebhookUrl(input.url);
      const existing = await Webhook.findOne({ where: { workspaceId: webhook.workspaceId, url: input.url } });
      if (existing) {
        throw new ApiError(409, "webhook_url_taken", "Já existe um webhook com esta URL neste workspace.");
      }
    }
    Object.assign(webhook, input);
    await webhook.save();
    return webhook;
  }

  async regenerateSecret(webhook: Webhook): Promise<{ webhook: Webhook; secret: string }> {
    const secret = randomBytes(24).toString("hex");
    webhook.secretEncrypted = encryptSecret(secret);
    webhook.consecutiveFailures = 0;
    await webhook.save();
    return { webhook, secret };
  }

  async remove(webhook: Webhook): Promise<void> {
    await webhook.softRemove();
  }

  async listLogs(webhookId: string) {
    return WebhookLog.find({ where: { webhookId }, order: { createdAt: "DESC" }, take: 100 });
  }
}

export const webhookService = new WebhookService();
