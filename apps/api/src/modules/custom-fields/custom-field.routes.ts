import { Router } from "express";
import { customFieldController } from "./custom-field.controller.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/custom-fields` (depois de `loadProject`). */
export const customFieldRouter = Router();

customFieldRouter.get("/", asyncHandler(customFieldController.list));
customFieldRouter.post("/", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(customFieldController.create));
customFieldRouter.patch(
  "/:fieldId",
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(customFieldController.update),
);
customFieldRouter.delete(
  "/:fieldId",
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(customFieldController.remove),
);
