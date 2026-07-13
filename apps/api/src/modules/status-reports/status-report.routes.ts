import { Router } from "express";
import { statusReportController } from "./status-report.controller.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/status-reports` (depois de `loadProject`). */
export const statusReportRouter = Router();

statusReportRouter.get("/", asyncHandler(statusReportController.list));
statusReportRouter.post("/", requireProjectRole(WorkspaceRole.MEMBER), asyncHandler(statusReportController.create));
statusReportRouter.patch(
  "/:reportId",
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(statusReportController.update),
);
statusReportRouter.post(
  "/:reportId/publish",
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(statusReportController.publish),
);
statusReportRouter.delete(
  "/:reportId",
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(statusReportController.remove),
);
