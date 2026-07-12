import type { NextFunction, Request, Response } from "express";
import { ProjectModule } from "../../entities/module.entity.js";
import { moduleService } from "./module.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      projectModule?: ProjectModule;
    }
  }
}

export async function loadModule(req: Request, _res: Response, next: NextFunction) {
  try {
    req.projectModule = await moduleService.findOrThrow(req.project!.id, req.params.moduleId!);
    next();
  } catch (err) {
    next(err);
  }
}
