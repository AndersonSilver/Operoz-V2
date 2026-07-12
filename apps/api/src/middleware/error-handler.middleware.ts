import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../common/api-error.js";
import { logger } from "../common/logger.js";

function isPostgresForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "23503";
}

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

  // Violação de FK com `ON DELETE RESTRICT` (ex.: tentar excluir um State
  // ainda referenciado por Issues) — código 23503 do Postgres.
  if (isPostgresForeignKeyViolation(err)) {
    return res.status(409).json({
      error: { code: "referenced_by_other_records", message: "Este registro ainda é referenciado por outros dados." },
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
