import { Router } from "express";
import { projectController, projectInviteController } from "./project.controller.js";
import { loadProject, requireProjectRole } from "./project.middleware.js";
import { requireWorkspaceRole } from "../workspaces/workspace.middleware.js";
import { requireAuth } from "../../middleware/require-auth.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";
import { stateRouter } from "../states/state.routes.js";
import { labelRouter } from "../labels/label.routes.js";
import { estimateRouter } from "../estimates/estimate.routes.js";
import { estimateController } from "../estimates/estimate.controller.js";
import { issueRouter } from "../issues/issue.routes.js";
import { cycleRouter } from "../cycles/cycle.routes.js";
import { moduleRouter } from "../modules/module.routes.js";
import { pageRouter } from "../pages/page.routes.js";
import { projectViewRouter } from "../views/view.routes.js";
import { customFieldRouter } from "../custom-fields/custom-field.routes.js";
import { statusReportRouter } from "../status-reports/status-report.routes.js";

/** Montado em `/workspaces/:slug/projects` (depois de `loadWorkspace`, então `req.workspace`/`req.workspaceMember` já existem). */
export const projectRouter = Router();

projectRouter.get("/", asyncHandler(projectController.list));
projectRouter.post("/", requireWorkspaceRole(WorkspaceRole.MEMBER), asyncHandler(projectController.create));
projectRouter.get("/identifier-check", asyncHandler(projectController.identifierCheck));

projectRouter.get("/favorites", asyncHandler(projectController.listFavorites));
projectRouter.post("/favorites", asyncHandler(projectController.addFavorite));
projectRouter.delete("/favorites/:entityId", asyncHandler(projectController.removeFavorite));

projectRouter.get("/:projectId", loadProject, asyncHandler(projectController.detail));
projectRouter.patch(
  "/:projectId",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.update),
);
projectRouter.delete(
  "/:projectId",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.remove),
);
projectRouter.post(
  "/:projectId/archive",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.archive),
);
projectRouter.delete(
  "/:projectId/archive",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.unarchive),
);

projectRouter.get("/:projectId/members", loadProject, asyncHandler(projectController.listMembers));
projectRouter.post(
  "/:projectId/members",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.addMembers),
);
projectRouter.patch(
  "/:projectId/members/:memberId",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.updateMemberRole),
);
projectRouter.delete(
  "/:projectId/members/:memberId",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.removeMember),
);
projectRouter.post("/:projectId/members/leave", loadProject, asyncHandler(projectController.leave));
projectRouter.patch(
  "/:projectId/members/me/preferences",
  loadProject,
  asyncHandler(projectController.updateMyPreferences),
);

projectRouter.get(
  "/:projectId/invitations",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.listInvites),
);
projectRouter.post(
  "/:projectId/invitations",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.createInvites),
);
projectRouter.delete(
  "/:projectId/invitations/:inviteId",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(projectController.removeInvite),
);

projectRouter.get("/:projectId/project-estimates", loadProject, asyncHandler(estimateController.activePoints));
projectRouter.delete(
  "/:projectId/project-estimates",
  loadProject,
  requireProjectRole(WorkspaceRole.ADMIN),
  asyncHandler(estimateController.deactivate),
);

projectRouter.use("/:projectId/states", loadProject, stateRouter);
projectRouter.use("/:projectId/labels", loadProject, labelRouter);
projectRouter.use("/:projectId/estimates", loadProject, estimateRouter);
projectRouter.use("/:projectId/issues", loadProject, issueRouter);
projectRouter.use("/:projectId/cycles", loadProject, cycleRouter);
projectRouter.use("/:projectId/modules", loadProject, moduleRouter);
projectRouter.use("/:projectId/pages", loadProject, pageRouter);
projectRouter.use("/:projectId/custom-fields", loadProject, customFieldRouter);
projectRouter.use("/:projectId/status-reports", loadProject, statusReportRouter);
projectRouter.use("/:projectId/views", loadProject, projectViewRouter);

/** Rotas por token de convite de projeto — não dependem de `:slug`/`:projectId`. */
export const projectInviteRouter = Router();

projectInviteRouter.get("/:token", asyncHandler(projectInviteController.preview));
projectInviteRouter.use(requireAuth);
projectInviteRouter.post("/:token/accept", asyncHandler(projectInviteController.accept));
projectInviteRouter.post("/:token/decline", asyncHandler(projectInviteController.decline));
