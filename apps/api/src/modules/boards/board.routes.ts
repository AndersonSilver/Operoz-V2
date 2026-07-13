import { Router } from "express";
import { boardController } from "./board.controller.js";
import { loadBoard, requireBoardRole } from "./board.middleware.js";
import { requireWorkspaceRole } from "../workspaces/workspace.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/boards` (depois de `loadWorkspace`). */
export const boardRouter = Router();

boardRouter.get("/", asyncHandler(boardController.list));
boardRouter.post("/", requireWorkspaceRole(WorkspaceRole.MEMBER), asyncHandler(boardController.create));

boardRouter.get("/:boardId", loadBoard, asyncHandler(boardController.detail));
boardRouter.patch("/:boardId", loadBoard, requireBoardRole(WorkspaceRole.ADMIN), asyncHandler(boardController.update));
boardRouter.delete("/:boardId", loadBoard, requireBoardRole(WorkspaceRole.ADMIN), asyncHandler(boardController.remove));

boardRouter.post(
  "/:boardId/archive",
  loadBoard,
  requireBoardRole(WorkspaceRole.ADMIN),
  asyncHandler(boardController.archive),
);
boardRouter.delete(
  "/:boardId/archive",
  loadBoard,
  requireBoardRole(WorkspaceRole.ADMIN),
  asyncHandler(boardController.unarchive),
);

boardRouter.get("/:boardId/meta", loadBoard, asyncHandler(boardController.meta));

boardRouter.get("/:boardId/projects", loadBoard, asyncHandler(boardController.listProjects));
boardRouter.post(
  "/:boardId/projects",
  loadBoard,
  requireBoardRole(WorkspaceRole.ADMIN),
  asyncHandler(boardController.addProject),
);
boardRouter.delete(
  "/:boardId/projects/:projectId",
  loadBoard,
  requireBoardRole(WorkspaceRole.ADMIN),
  asyncHandler(boardController.removeProject),
);

boardRouter.get("/:boardId/members", loadBoard, asyncHandler(boardController.listMembers));
boardRouter.post(
  "/:boardId/members",
  loadBoard,
  requireBoardRole(WorkspaceRole.ADMIN),
  asyncHandler(boardController.addMember),
);
boardRouter.patch(
  "/:boardId/members/:memberId",
  loadBoard,
  requireBoardRole(WorkspaceRole.ADMIN),
  asyncHandler(boardController.updateMember),
);
boardRouter.delete(
  "/:boardId/members/:memberId",
  loadBoard,
  requireBoardRole(WorkspaceRole.ADMIN),
  asyncHandler(boardController.removeMember),
);
