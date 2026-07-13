import { Router } from "express";
import { teamController } from "./team.controller.js";
import { requireWorkspaceRole } from "../workspaces/workspace.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/teams` (depois de `loadWorkspace`). */
export const teamRouter = Router();

teamRouter.get("/", asyncHandler(teamController.list));
teamRouter.post("/", requireWorkspaceRole(WorkspaceRole.ADMIN), asyncHandler(teamController.create));
teamRouter.patch("/:teamId", requireWorkspaceRole(WorkspaceRole.ADMIN), asyncHandler(teamController.update));
teamRouter.delete("/:teamId", requireWorkspaceRole(WorkspaceRole.ADMIN), asyncHandler(teamController.remove));

teamRouter.get("/:teamId/members", asyncHandler(teamController.listMembers));
teamRouter.post(
  "/:teamId/members",
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(teamController.addMembers),
);
teamRouter.delete(
  "/:teamId/members/:userId",
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(teamController.removeMember),
);
