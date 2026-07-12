import type { Request, Response } from "express";
import { notificationService } from "./notification.service.js";
import {
  listNotificationsQuerySchema,
  markAllReadSchema,
  snoozeNotificationSchema,
  updateNotificationPreferenceSchema,
} from "./notification.schemas.js";

export const notificationController = {
  async list(req: Request, res: Response) {
    const filters = listNotificationsQuerySchema.parse(req.query);
    const notifications = await notificationService.list(req.user!.id, req.workspace!.id, filters);
    res.json({ notifications });
  },

  async detail(req: Request, res: Response) {
    const notification = await notificationService.findOrThrow(req.user!.id, req.params.notificationId!);
    res.json({ notification });
  },

  async snooze(req: Request, res: Response) {
    const { snoozedTill } = snoozeNotificationSchema.parse(req.body);
    const notification = await notificationService.findOrThrow(req.user!.id, req.params.notificationId!);
    const updated = await notificationService.snooze(notification, snoozedTill);
    res.json({ notification: updated });
  },

  async remove(req: Request, res: Response) {
    const notification = await notificationService.findOrThrow(req.user!.id, req.params.notificationId!);
    await notification.remove();
    res.status(204).send();
  },

  async markRead(req: Request, res: Response) {
    const notification = await notificationService.findOrThrow(req.user!.id, req.params.notificationId!);
    res.json({ notification: await notificationService.markRead(notification) });
  },

  async markUnread(req: Request, res: Response) {
    const notification = await notificationService.findOrThrow(req.user!.id, req.params.notificationId!);
    res.json({ notification: await notificationService.markUnread(notification) });
  },

  async archive(req: Request, res: Response) {
    const notification = await notificationService.findOrThrow(req.user!.id, req.params.notificationId!);
    res.json({ notification: await notificationService.archive(notification) });
  },

  async unarchive(req: Request, res: Response) {
    const notification = await notificationService.findOrThrow(req.user!.id, req.params.notificationId!);
    res.json({ notification: await notificationService.unarchive(notification) });
  },

  async markAllRead(req: Request, res: Response) {
    const filters = markAllReadSchema.parse(req.body);
    await notificationService.markAllRead(req.user!.id, req.workspace!.id, filters);
    res.status(204).send();
  },

  async unreadCounts(req: Request, res: Response) {
    res.json(await notificationService.getUnreadCounts(req.user!.id, req.workspace!.id));
  },

  async getPreference(req: Request, res: Response) {
    res.json({ preference: await notificationService.getOrCreatePreference(req.user!.id) });
  },

  async updatePreference(req: Request, res: Response) {
    const input = updateNotificationPreferenceSchema.parse(req.body);
    res.json({ preference: await notificationService.updatePreference(req.user!.id, input) });
  },
};
