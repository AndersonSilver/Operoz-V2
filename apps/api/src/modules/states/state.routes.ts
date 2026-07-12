import { Router } from "express";
import { stateController } from "./state.controller.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/states` (depois de `loadProject`). */
export const stateRouter = Router();

stateRouter.get("/", asyncHandler(stateController.list));
stateRouter.post("/", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(stateController.create));
stateRouter.get("/intake", asyncHandler(stateController.triage));
stateRouter.patch("/:stateId", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(stateController.update));
stateRouter.post(
  "/:stateId/mark-default",
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(stateController.markDefault),
);
stateRouter.delete("/:stateId", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(stateController.remove));
