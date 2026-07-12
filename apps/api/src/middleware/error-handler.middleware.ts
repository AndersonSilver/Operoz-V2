import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../common/api-error.js";
import { logger } from "../common/logger.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "validation_error",
        message: "Dados inválidos.",
        details: err.flatten().fieldErrors,
      },
    });
  }

  logger.error({ err, path: req.path, method: req.method }, "Erro não tratado");
  return res.status(500).json({
    error: { code: "internal_error", message: "Algo deu errado. Tente novamente." },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: "not_found", message: "Rota não encontrada." } });
}
