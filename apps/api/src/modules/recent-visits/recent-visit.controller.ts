import type { Request, Response } from "express";
import { recentVisitService } from "./recent-visit.service.js";
import { recordVisitSchema } from "./recent-visit.schemas.js";

export const recentVisitController = {
  async list(req: Request, res: Response) {
    const visits = await recentVisitService.list(req.workspace!.id, req.user!.id);
    res.json({ visits });
  },

  async record(req: Request, res: Response) {
    const { entityType, entityId } = recordVisitSchema.parse(req.body);
    await recentVisitService.record(req.workspace!.id, req.user!.id, entityType, entityId);
    res.status(204).send();
  },
};
