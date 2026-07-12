import type { NextFunction, Request, Response } from "express";
import { User } from "../entities/user.entity.js";
import { ApiToken } from "../entities/api-token.entity.js";
import { ApiError } from "../common/api-error.js";
import { apiTokenService } from "../modules/api-tokens/api-token.service.js";
import { hashApiToken } from "../modules/api-tokens/api-token-crypto.js";
import { apiTokenNormalLimiter, apiTokenServiceLimiter } from "./rate-limit.middleware.js";

const API_KEY_HEADER = "x-api-key";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      /** Setado só quando a request foi autenticada via `X-Api-Key` (não via sessão). */
      apiToken?: ApiToken;
    }
  }
}

/**
 * Duas vias de autenticação, mutuamente exclusivas por request:
 * `X-Api-Key` (uso programático — a mesma chave dá acesso a tudo que o
 * usuário dono já tem, sem escopo restrito, replicando o comportamento
 * do original) tem prioridade se presente; senão cai para sessão/cookie
 * (uso do frontend interno).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.get(API_KEY_HEADER);
  if (apiKey) {
    const tokenHash = hashApiToken(apiKey);
    const token = await ApiToken.findOne({ where: { tokenHash, isActive: true } });
    if (!token || (token.expiresAt && token.expiresAt < new Date())) {
      return next(new ApiError(401, "invalid_api_token", "Token de API inválido ou expirado."));
    }
    const user = await User.findOne({ where: { id: token.userId, isActive: true } });
    if (!user) {
      return next(new ApiError(401, "invalid_api_token", "Token de API inválido ou expirado."));
    }
    req.user = user;
    req.apiToken = token;
    void apiTokenService.touchLastUsed(token);
    const limiter = token.isService ? apiTokenServiceLimiter : apiTokenNormalLimiter;
    return limiter(req, res, next);
  }

  const userId = req.session.userId;
  if (!userId) {
    return next(new ApiError(401, "not_authenticated", "Autenticação necessária."));
  }

  const user = await User.findOne({ where: { id: userId, isActive: true } });
  if (!user) {
    req.session.destroy(() => {});
    return next(new ApiError(401, "not_authenticated", "Sessão inválida."));
  }

  req.user = user;
  next();
}
