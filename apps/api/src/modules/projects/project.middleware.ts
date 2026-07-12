import type { NextFunction, Request, Response } from "express";
import { Project, ProjectNetwork } from "../../entities/project.entity.js";
import { ProjectMember } from "../../entities/project-member.entity.js";
import { ApiError } from "../../common/api-error.js";
import { WorkspaceRole } from "../../common/roles.js";
import { projectService } from "./project.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      project?: Project;
      projectMember?: ProjectMember | null;
    }
  }
}

/**
 * Papel efetivo no projeto: Admin de workspace sempre atua como Admin do
 * projeto (override, seção 2.3 da spec). Retorna `-1` (sentinela, não um
 * papel válido) quando o usuário não tem nenhum vínculo com o projeto.
 */
export function effectiveProjectRole(req: Request): number {
  if (req.workspaceMember && req.workspaceMember.role >= WorkspaceRole.ADMIN) {
    return WorkspaceRole.ADMIN;
  }
  return req.projectMember?.role ?? -1;
}

/**
 * Resolve `:projectId` dentro do workspace já carregado (`loadWorkspace`
 * deve rodar antes). Segue a mesma regra de visibilidade da listagem:
 * Admin de workspace vê tudo; demais precisam ser membro ativo do
 * projeto, ou o projeto precisa ser público (para Member+).
 */
export async function loadProject(req: Request, _res: Response, next: NextFunction) {
  try {
    const project = await projectService.findByIdOrThrow(req.workspace!.id, req.params.projectId!);
    const membership = await projectService.getMembership(project.id, req.user!.id);

    const isWorkspaceAdmin = req.workspaceMember!.role >= WorkspaceRole.ADMIN;
    const isPublicViewableByMember =
      project.network === ProjectNetwork.PUBLIC && req.workspaceMember!.role >= WorkspaceRole.MEMBER;

    if (!isWorkspaceAdmin && !membership && !isPublicViewableByMember) {
      // Esconde a existência de projetos secretos para não-membros.
      return next(new ApiError(404, "project_not_found", "Projeto não encontrado."));
    }

    req.project = project;
    req.projectMember = membership;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireProjectRole(minRole: WorkspaceRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (effectiveProjectRole(req) < minRole) {
      return next(new ApiError(403, "insufficient_project_role", "Você não tem permissão para esta ação."));
    }
    next();
  };
}
