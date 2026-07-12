import { Router } from "express";
import { estimateController } from "./estimate.controller.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/estimates` (depois de `loadProject`). */
export const estimateRouter = Router();

estimateRouter.get("/", asyncHandler(estimateController.list));
estimateRouter.post("/", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(estimateController.create));
estimateRouter.get("/:estimateId", asyncHandler(estimateController.detail));
estimateRouter.patch("/:estimateId", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(estimateController.update));
estimateRouter.delete("/:estimateId", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(estimateController.remove));
estimateRouter.post(
  "/:estimateId/activate",
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(estimateController.activate),
);
estimateRouter.post(
  "/:estimateId/estimate-points",
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(estimateController.addPoint),
);
estimateRouter.patch(
  "/:estimateId/estimate-points/:pointId",
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(estimateController.updatePoint),
);
estimateRouter.delete(
  "/:estimateId/estimate-points/:pointId",
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(estimateController.removePoint),
);
