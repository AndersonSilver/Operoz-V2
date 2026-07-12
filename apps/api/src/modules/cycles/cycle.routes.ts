import { Router } from "express";
import { cycleController } from "./cycle.controller.js";
import { loadCycle } from "./cycle.middleware.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/cycles` (depois de `loadProject`). */
export const cycleRouter = Router();

cycleRouter.get("/", asyncHandler(cycleController.list));
cycleRouter.post("/", requireProjectRole(WorkspaceRole.MEMBER), asyncHandler(cycleController.create));
cycleRouter.post("/date-check", asyncHandler(cycleController.dateCheck));
cycleRouter.get("/archived", asyncHandler(cycleController.listArchived));

cycleRouter.get("/:cycleId", loadCycle, asyncHandler(cycleController.detail));
cycleRouter.patch(
  "/:cycleId",
  loadCycle,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(cycleController.update),
);
cycleRouter.delete("/:cycleId", loadCycle, asyncHandler(cycleController.remove));
cycleRouter.post(
  "/:cycleId/archive",
  loadCycle,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(cycleController.archive),
);
cycleRouter.delete(
  "/:cycleId/archive",
  loadCycle,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(cycleController.unarchive),
);

cycleRouter.get("/:cycleId/cycle-issues", loadCycle, asyncHandler(cycleController.listIssues));
cycleRouter.post(
  "/:cycleId/cycle-issues",
  loadCycle,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(cycleController.addIssues),
);
cycleRouter.delete(
  "/:cycleId/cycle-issues/:issueId",
  loadCycle,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(cycleController.removeIssue),
);
cycleRouter.post(
  "/:cycleId/transfer-issues",
  loadCycle,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(cycleController.transferIssues),
);

cycleRouter.get("/:cycleId/progress", loadCycle, asyncHandler(cycleController.progress));
cycleRouter.get("/:cycleId/analytics", loadCycle, asyncHandler(cycleController.analytics));
