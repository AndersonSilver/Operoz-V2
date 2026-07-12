import type { NextFunction, Request, Response } from "express";
import { Workspace } from "../../entities/workspace.entity.js";
import { WorkspaceMember } from "../../entities/workspace-member.entity.js";
import { ApiError } from "../../common/api-error.js";
import { WorkspaceRole } from "../../common/roles.js";
import { workspaceService } from "./workspace.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      workspace?: Workspace;
      workspaceMember?: WorkspaceMember;
    }
  }
}

/**
 * Resolve `:slug` para o workspace e garante que o usuário é membro ativo.
 * Precisa capturar erros manualmente (em vez de deixar a Promise rejeitar):
 * Express 4 não encaminha rejeições de middlewares assíncronos para o
 * error handler — uma rejeição não tratada aqui derruba o processo Node
 * inteiro (já aconteceu, verificado em teste real).
 */
export async function loadWorkspace(req: Request, _res: Response, next: NextFunction) {
  try {
    const workspace = await workspaceService.findBySlugOrThrow(req.params.slug!);
    const membership = await workspaceService.getMembership(workspace.id, req.user!.id);
    if (!membership) {
      return next(new ApiError(403, "not_a_member", "Você não é membro deste workspace."));
    }
    req.workspace = workspace;
    req.workspaceMember = membership;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireWorkspaceRole(minRole: WorkspaceRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.workspaceMember || req.workspaceMember.role < minRole) {
      return next(new ApiError(403, "insufficient_workspace_role", "Você não tem permissão para esta ação."));
    }
    next();
  };
}

/** Diferente de "Admin": exige ser o dono real (`workspace.ownerId`), não apenas ter role Admin. */
export function requireWorkspaceOwner(req: Request, _res: Response, next: NextFunction) {
  if (!req.workspace || req.workspace.ownerId !== req.user!.id) {
    return next(new ApiError(403, "not_owner", "Apenas o dono do workspace pode realizar esta ação."));
  }
  next();
}
