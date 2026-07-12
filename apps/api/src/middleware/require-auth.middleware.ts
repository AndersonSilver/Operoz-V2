import type { NextFunction, Request, Response } from "express";
import { User } from "../entities/user.entity.js";
import { ApiError } from "../common/api-error.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
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
