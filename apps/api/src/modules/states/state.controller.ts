import type { Request, Response } from "express";
import { stateService } from "./state.service.js";
import { createStateSchema, updateStateSchema } from "./state.schemas.js";

export const stateController = {
  async list(req: Request, res: Response) {
    const states = await stateService.list(req.project!.id);
    res.json({ states });
  },

  async listForWorkspace(req: Request, res: Response) {
    const states = await stateService.listForWorkspace(req.workspace!.id, req.user!.id);
    res.json({ states });
  },

  async create(req: Request, res: Response) {
    const input = createStateSchema.parse(req.body);
    const state = await stateService.create(req.project!, input);
    res.status(201).json({ state });
  },

  async update(req: Request, res: Response) {
    const input = updateStateSchema.parse(req.body);
    const state = await stateService.update(req.project!, req.params.stateId!, input);
    res.json({ state });
  },

  async markDefault(req: Request, res: Response) {
    const state = await stateService.markDefault(req.project!, req.params.stateId!);
    res.json({ state });
  },

  async remove(req: Request, res: Response) {
    await stateService.remove(req.project!, req.params.stateId!);
    res.status(204).send();
  },

  async triage(req: Request, res: Response) {
    const state = await stateService.getOrCreateTriage(req.project!);
    res.json({ state });
  },
};
