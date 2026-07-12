import type { NextFunction, Request, Response } from "express";
import { Cycle } from "../../entities/cycle.entity.js";
import { cycleService } from "./cycle.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      cycle?: Cycle;
    }
  }
}

export async function loadCycle(req: Request, _res: Response, next: NextFunction) {
  try {
    req.cycle = await cycleService.findOrThrow(req.project!.id, req.params.cycleId!);
    next();
  } catch (err) {
    next(err);
  }
}
