import type { NextFunction, Request, Response } from "express";
import { Board } from "../../entities/board.entity.js";
import { BoardMember } from "../../entities/board-member.entity.js";
import { ApiError } from "../../common/api-error.js";
import { WorkspaceRole } from "../../common/roles.js";
import { boardService } from "./board.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      board?: Board;
      boardMember?: BoardMember | null;
    }
  }
}

/** Espelha `effectiveProjectRole`: Admin de workspace sempre atua como Admin do board. */
export function effectiveBoardRole(req: Request): number {
  if (req.workspaceMember && req.workspaceMember.role >= WorkspaceRole.ADMIN) {
    return WorkspaceRole.ADMIN;
  }
  return req.boardMember?.role ?? -1;
}

/** Resolve `:boardId` dentro do workspace já carregado (`loadWorkspace` deve rodar antes). */
export async function loadBoard(req: Request, _res: Response, next: NextFunction) {
  try {
    const board = await boardService.findByIdOrThrow(req.workspace!.id, req.params.boardId!);
    const membership = await boardService.getMembership(board.id, req.user!.id);
    const isWorkspaceAdmin = req.workspaceMember!.role >= WorkspaceRole.ADMIN;

    if (!isWorkspaceAdmin && !membership) {
      return next(new ApiError(404, "board_not_found", "Board não encontrado."));
    }

    req.board = board;
    req.boardMember = membership;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireBoardRole(minRole: WorkspaceRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (effectiveBoardRole(req) < minRole) {
      return next(new ApiError(403, "insufficient_board_role", "Você não tem permissão para esta ação."));
    }
    next();
  };
}
