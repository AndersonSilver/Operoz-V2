import { Router } from "express";
import { moduleController } from "./module.controller.js";
import { loadModule } from "./module.middleware.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/modules` (depois de `loadProject`). */
export const moduleRouter = Router();

moduleRouter.get("/", asyncHandler(moduleController.list));
moduleRouter.post("/", requireProjectRole(WorkspaceRole.MEMBER), asyncHandler(moduleController.create));
moduleRouter.get("/archived", asyncHandler(moduleController.listArchived));

moduleRouter.get("/:moduleId", loadModule, asyncHandler(moduleController.detail));
moduleRouter.patch(
  "/:moduleId",
  loadModule,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(moduleController.update),
);
moduleRouter.delete("/:moduleId", loadModule, asyncHandler(moduleController.remove));
moduleRouter.post(
  "/:moduleId/archive",
  loadModule,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(moduleController.archive),
);
moduleRouter.delete(
  "/:moduleId/archive",
  loadModule,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(moduleController.unarchive),
);

moduleRouter.get("/:moduleId/module-issues", loadModule, asyncHandler(moduleController.listIssues));
moduleRouter.post(
  "/:moduleId/module-issues",
  loadModule,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(moduleController.addIssues),
);
moduleRouter.delete(
  "/:moduleId/module-issues/:issueId",
  loadModule,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(moduleController.removeIssue),
);

moduleRouter.get("/:moduleId/progress", loadModule, asyncHandler(moduleController.progress));

moduleRouter.get("/:moduleId/links", loadModule, asyncHandler(moduleController.listLinks));
moduleRouter.post(
  "/:moduleId/links",
  loadModule,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(moduleController.addLink),
);
moduleRouter.delete(
  "/:moduleId/links/:linkId",
  loadModule,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(moduleController.removeLink),
);
