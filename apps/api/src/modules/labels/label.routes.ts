import { Router } from "express";
import { labelController } from "./label.controller.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/labels` (depois de `loadProject`). */
export const labelRouter = Router();

labelRouter.get("/", asyncHandler(labelController.list));
labelRouter.post("/", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(labelController.create));
labelRouter.post("/bulk-create", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(labelController.bulkCreate));
labelRouter.patch("/:labelId", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(labelController.update));
labelRouter.delete("/:labelId", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(labelController.remove));
