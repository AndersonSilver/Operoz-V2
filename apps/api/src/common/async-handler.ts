import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 não encaminha rejeições de Promise para o error handler
 * automaticamente — todo controller assíncrono precisa passar por aqui.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
