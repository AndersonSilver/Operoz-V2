import { Router } from "express";
import { projectViewController, workspaceViewController } from "./view.controller.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { requireWorkspaceRole } from "../workspaces/workspace.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/views` (depois de `loadProject`). */
export const projectViewRouter = Router();

projectViewRouter.get("/", asyncHandler(projectViewController.list));
projectViewRouter.post("/", requireProjectRole(WorkspaceRole.MEMBER), asyncHandler(projectViewController.create));
projectViewRouter.get("/:viewId", asyncHandler(projectViewController.detail));
projectViewRouter.patch("/:viewId", asyncHandler(projectViewController.update));
projectViewRouter.delete("/:viewId", asyncHandler(projectViewController.remove));

/** Montado em `/workspaces/:slug/views` (depois de `loadWorkspace`) — views de escopo workspace inteiro (`projectId` nulo). */
export const workspaceViewRouter = Router();

workspaceViewRouter.get("/", asyncHandler(workspaceViewController.list));
workspaceViewRouter.post(
  "/",
  requireWorkspaceRole(WorkspaceRole.MEMBER),
  asyncHandler(workspaceViewController.create),
);
workspaceViewRouter.get("/:viewId", asyncHandler(workspaceViewController.detail));
workspaceViewRouter.patch("/:viewId", asyncHandler(workspaceViewController.update));
workspaceViewRouter.delete("/:viewId", asyncHandler(workspaceViewController.remove));
