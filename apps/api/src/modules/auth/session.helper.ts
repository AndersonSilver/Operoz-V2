import type { Request } from "express";
import type { User } from "../../entities/user.entity.js";
import { workspaceService } from "../workspaces/workspace.service.js";
import { projectService } from "../projects/project.service.js";

/**
 * Cria a sessão autenticada para `user`. Regenera o session ID antes de
 * gravar dados (proteção contra session fixation — nunca reaproveita um
 * ID de sessão que já existia antes do login).
 */
export async function establishSession(req: Request, user: User): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      req.session.deviceInfo = {
        userAgent: req.get("user-agent") ?? undefined,
        ip: req.ip,
      };
      req.session.save((saveErr) => {
        if (saveErr) return reject(saveErr);
        resolve();
      });
    });
  });

  // Todo login/signup bem-sucedido processa convites pendentes para o
  // e-mail do usuário (equivalente ao fluxo original). Workspace primeiro:
  // convite de projeto só se concretiza se o usuário já for membro do
  // workspace correspondente.
  await workspaceService.autoJoinPendingInvites(user);
  await projectService.autoJoinPendingInvites(user);
}

export function destroySession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
