import { Router } from "express";
import { client360Controller } from "./client-360.controller.js";
import { requireBoardRole } from "../boards/board.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/boards/:boardId/client-360` (depois de `loadBoard`). */
export const client360Router = Router();

client360Router.get("/", asyncHandler(client360Controller.list));
client360Router.get(
  "/health-settings",
  requireBoardRole(WorkspaceRole.ADMIN),
  asyncHandler(client360Controller.getHealthSettings),
);
client360Router.patch(
  "/health-settings",
  requireBoardRole(WorkspaceRole.ADMIN),
  asyncHandler(client360Controller.updateHealthSettings),
);
client360Router.get("/:projectId", asyncHandler(client360Controller.detail));
client360Router.get("/:projectId/health-history", asyncHandler(client360Controller.healthHistory));
