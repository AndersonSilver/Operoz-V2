import { Router } from "express";
import { analyticsController } from "./analytics.controller.js";
import { requireWorkspaceRole } from "../workspaces/workspace.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug` (depois de `loadWorkspace`). */
export const analyticsRouter = Router();

analyticsRouter.get("/analytics", asyncHandler(analyticsController.adhoc));
analyticsRouter.get("/default-analytics", asyncHandler(analyticsController.defaultDashboard));
analyticsRouter.get("/project-stats", asyncHandler(analyticsController.projectStats));

// Dashboards salvos: CRUD restrito a Admin do workspace; leitura/reexecução liberada a qualquer membro.
analyticsRouter.get("/analytic-view", asyncHandler(analyticsController.listViews));
analyticsRouter.post(
  "/analytic-view",
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(analyticsController.createView),
);
analyticsRouter.patch(
  "/analytic-view/:viewId",
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(analyticsController.updateView),
);
analyticsRouter.delete(
  "/analytic-view/:viewId",
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(analyticsController.removeView),
);
analyticsRouter.get("/saved-analytic-view/:viewId", asyncHandler(analyticsController.runSavedView));
