import { Router } from "express";
import { webhookController } from "./webhook.controller.js";
import { requireWorkspaceRole } from "../workspaces/workspace.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/webhooks` (depois de `loadWorkspace`) — sempre restrito a Admin do workspace. */
export const webhookRouter = Router();

webhookRouter.use(requireWorkspaceRole(WorkspaceRole.ADMIN));

webhookRouter.get("/", asyncHandler(webhookController.list));
webhookRouter.post("/", asyncHandler(webhookController.create));
webhookRouter.get("/:webhookId", asyncHandler(webhookController.detail));
webhookRouter.patch("/:webhookId", asyncHandler(webhookController.update));
webhookRouter.delete("/:webhookId", asyncHandler(webhookController.remove));
webhookRouter.post("/:webhookId/regenerate", asyncHandler(webhookController.regenerate));
webhookRouter.get("/:webhookId/webhook-logs", asyncHandler(webhookController.listLogs));
