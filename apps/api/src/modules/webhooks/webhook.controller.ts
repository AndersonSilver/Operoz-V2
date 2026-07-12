import type { Request, Response } from "express";
import { webhookService } from "./webhook.service.js";
import { serializeWebhook } from "./webhook.serializer.js";
import { createWebhookSchema, updateWebhookSchema } from "./webhook.schemas.js";

export const webhookController = {
  async list(req: Request, res: Response) {
    const webhooks = await webhookService.list(req.workspace!.id);
    res.json({ webhooks: webhooks.map(serializeWebhook) });
  },

  async create(req: Request, res: Response) {
    const input = createWebhookSchema.parse(req.body);
    const { webhook, secret } = await webhookService.create(req.workspace!, req.user!, input);
    res.status(201).json({ webhook: serializeWebhook(webhook), secret });
  },

  async detail(req: Request, res: Response) {
    const webhook = await webhookService.findOrThrow(req.workspace!.id, req.params.webhookId!);
    res.json({ webhook: serializeWebhook(webhook) });
  },

  async update(req: Request, res: Response) {
    const input = updateWebhookSchema.parse(req.body);
    const webhook = await webhookService.findOrThrow(req.workspace!.id, req.params.webhookId!);
    const updated = await webhookService.update(webhook, input);
    res.json({ webhook: serializeWebhook(updated) });
  },

  async remove(req: Request, res: Response) {
    const webhook = await webhookService.findOrThrow(req.workspace!.id, req.params.webhookId!);
    await webhookService.remove(webhook);
    res.status(204).send();
  },

  async regenerate(req: Request, res: Response) {
    const webhook = await webhookService.findOrThrow(req.workspace!.id, req.params.webhookId!);
    const { webhook: updated, secret } = await webhookService.regenerateSecret(webhook);
    res.json({ webhook: serializeWebhook(updated), secret });
  },

  async listLogs(req: Request, res: Response) {
    const webhook = await webhookService.findOrThrow(req.workspace!.id, req.params.webhookId!);
    const logs = await webhookService.listLogs(webhook.id);
    res.json({ logs });
  },
};
