import { Router } from "express";
import { workspaceController, workspaceInviteController } from "./workspace.controller.js";
import { requireAuth } from "../../middleware/require-auth.middleware.js";
import { loadWorkspace, requireWorkspaceOwner, requireWorkspaceRole } from "./workspace.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";
import { projectRouter } from "../projects/project.routes.js";

export const workspaceRouter = Router();

workspaceRouter.use(requireAuth);
workspaceRouter.use("/:slug/projects", loadWorkspace, projectRouter);

workspaceRouter.get("/", asyncHandler(workspaceController.list));
workspaceRouter.post("/", asyncHandler(workspaceController.create));
workspaceRouter.get("/slug-check", asyncHandler(workspaceController.slugCheck));

workspaceRouter.get("/:slug", loadWorkspace, asyncHandler(workspaceController.detail));
workspaceRouter.patch(
  "/:slug",
  loadWorkspace,
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(workspaceController.update),
);
workspaceRouter.delete("/:slug", loadWorkspace, requireWorkspaceOwner, asyncHandler(workspaceController.remove));
workspaceRouter.post(
  "/:slug/transfer-ownership",
  loadWorkspace,
  requireWorkspaceOwner,
  asyncHandler(workspaceController.transferOwnership),
);

workspaceRouter.get("/:slug/members", loadWorkspace, asyncHandler(workspaceController.listMembers));
workspaceRouter.patch(
  "/:slug/members/:memberId",
  loadWorkspace,
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(workspaceController.updateMemberRole),
);
workspaceRouter.delete(
  "/:slug/members/:memberId",
  loadWorkspace,
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(workspaceController.removeMember),
);
workspaceRouter.post("/:slug/members/leave", loadWorkspace, asyncHandler(workspaceController.leave));

workspaceRouter.get(
  "/:slug/invitations",
  loadWorkspace,
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(workspaceController.listInvites),
);
workspaceRouter.post(
  "/:slug/invitations",
  loadWorkspace,
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(workspaceController.createInvites),
);
workspaceRouter.delete(
  "/:slug/invitations/:inviteId",
  loadWorkspace,
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(workspaceController.removeInvite),
);

workspaceRouter.get("/:slug/user-properties", loadWorkspace, asyncHandler(workspaceController.getUserProperties));
workspaceRouter.patch(
  "/:slug/user-properties",
  loadWorkspace,
  asyncHandler(workspaceController.updateUserProperties),
);

workspaceRouter.get("/:slug/themes", loadWorkspace, asyncHandler(workspaceController.listThemes));
workspaceRouter.post(
  "/:slug/themes",
  loadWorkspace,
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(workspaceController.createTheme),
);
workspaceRouter.patch(
  "/:slug/themes/:themeId",
  loadWorkspace,
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(workspaceController.updateTheme),
);
workspaceRouter.delete(
  "/:slug/themes/:themeId",
  loadWorkspace,
  requireWorkspaceRole(WorkspaceRole.ADMIN),
  asyncHandler(workspaceController.removeTheme),
);

/** Rotas por token de convite — não usam `:slug`, então ficam num router à parte. */
export const workspaceInviteRouter = Router();

workspaceInviteRouter.get("/:token", asyncHandler(workspaceInviteController.preview));
workspaceInviteRouter.use(requireAuth);
workspaceInviteRouter.post("/:token/accept", asyncHandler(workspaceInviteController.accept));
workspaceInviteRouter.post("/:token/decline", asyncHandler(workspaceInviteController.decline));
