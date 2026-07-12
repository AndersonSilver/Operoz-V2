import { Router } from "express";
import { issueController } from "./issue.controller.js";
import { loadIssue } from "./issue.middleware.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/issues` (depois de `loadProject`). Guest só lê. */
export const issueRouter = Router();

issueRouter.get("/", asyncHandler(issueController.list));
issueRouter.post("/", requireProjectRole(WorkspaceRole.MEMBER), asyncHandler(issueController.create));
issueRouter.get("/list", asyncHandler(issueController.listByIds));
issueRouter.get(
  "/archived",
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(issueController.archivedList),
);

issueRouter.post(
  "/bulk-update",
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(issueController.bulkUpdate),
);
issueRouter.post("/bulk-delete", requireProjectRole(WorkspaceRole.ADMIN), asyncHandler(issueController.bulkDelete));
issueRouter.post(
  "/bulk-archive",
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(issueController.bulkArchive),
);

issueRouter.get("/:issueId", loadIssue, asyncHandler(issueController.detail));
issueRouter.patch(
  "/:issueId",
  loadIssue,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(issueController.update),
);
issueRouter.delete(
  "/:issueId",
  loadIssue,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(issueController.remove),
);
issueRouter.post(
  "/:issueId/archive",
  loadIssue,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(issueController.archive),
);
issueRouter.delete(
  "/:issueId/archive",
  loadIssue,
  requireProjectRole(WorkspaceRole.MEMBER),
  asyncHandler(issueController.unarchive),
);
issueRouter.get("/:issueId/meta", loadIssue, asyncHandler(issueController.meta));
