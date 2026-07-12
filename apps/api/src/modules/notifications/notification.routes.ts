import { Router } from "express";
import { notificationController } from "./notification.controller.js";
import { asyncHandler } from "../../common/async-handler.js";

/** Montado em `/workspaces/:slug/notifications` (depois de `loadWorkspace`) — sempre escopado ao usuário autenticado. */
export const notificationRouter = Router();

notificationRouter.get("/", asyncHandler(notificationController.list));
notificationRouter.post("/mark-all-read", asyncHandler(notificationController.markAllRead));
notificationRouter.get("/:notificationId", asyncHandler(notificationController.detail));
notificationRouter.patch("/:notificationId", asyncHandler(notificationController.snooze));
notificationRouter.delete("/:notificationId", asyncHandler(notificationController.remove));
notificationRouter.post("/:notificationId/mark-read", asyncHandler(notificationController.markRead));
notificationRouter.post("/:notificationId/mark-unread", asyncHandler(notificationController.markUnread));
notificationRouter.post("/:notificationId/archive", asyncHandler(notificationController.archive));
notificationRouter.delete("/:notificationId/archive", asyncHandler(notificationController.unarchive));
