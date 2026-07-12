import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../common/api-error.js";

const CSRF_COOKIE_NAME = "operoz_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Double-submit cookie: um cookie legível por JS (não httpOnly) precisa
 * ser ecoado num header custom em toda requisição de mutação. Um atacante
 * cross-site consegue disparar o request (cookies vão automático), mas não
 * consegue ler o cookie para montar o header — isso é o que barra o CSRF.
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  if (!token) {
    token = randomBytes(24).toString("hex");
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: env.isProduction,
      sameSite: "lax",
      domain: env.COOKIE_DOMAIN || undefined,
      maxAge: env.SESSION_COOKIE_MAX_AGE_MS,
    });
  }

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Autenticação via `X-Api-Key` é imune a CSRF por natureza — não é
  // enviada automaticamente pelo navegador em requests cross-site como
  // um cookie seria, então não faz sentido exigir o double-submit aqui.
  if (req.get("x-api-key")) {
    return next();
  }

  const headerToken = req.get(CSRF_HEADER_NAME);
  if (!headerToken || headerToken !== token) {
    return next(new ApiError(403, "csrf_validation_failed", "Falha na validação CSRF."));
  }

  next();
}
