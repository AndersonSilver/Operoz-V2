import type { Request, Response } from "express";
import { stickyService } from "./sticky.service.js";
import { createStickySchema, listStickiesQuerySchema, updateStickySchema } from "./sticky.schemas.js";

export const stickyController = {
  async list(req: Request, res: Response) {
    const { query } = listStickiesQuerySchema.parse(req.query);
    const stickies = await stickyService.list(req.workspace!.id, req.user!.id, query);
    res.json({ stickies });
  },

  async create(req: Request, res: Response) {
    const input = createStickySchema.parse(req.body);
    const sticky = await stickyService.create(req.workspace!.id, req.user!.id, input);
    res.status(201).json({ sticky });
  },

  async update(req: Request, res: Response) {
    const input = updateStickySchema.parse(req.body);
    const sticky = await stickyService.update(req.workspace!.id, req.user!.id, req.params.stickyId!, input);
    res.json({ sticky });
  },

  async remove(req: Request, res: Response) {
    await stickyService.remove(req.workspace!.id, req.user!.id, req.params.stickyId!);
    res.status(204).send();
  },
};
