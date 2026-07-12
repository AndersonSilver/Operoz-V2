import type { Request, Response } from "express";
import { labelService } from "./label.service.js";
import { bulkCreateLabelsSchema, createLabelSchema, updateLabelSchema } from "./label.schemas.js";

export const labelController = {
  async list(req: Request, res: Response) {
    const labels = await labelService.list(req.project!.id);
    res.json({ labels });
  },

  async listForWorkspace(req: Request, res: Response) {
    const labels = await labelService.listForWorkspace(req.workspace!.id, req.user!.id);
    res.json({ labels });
  },

  async create(req: Request, res: Response) {
    const input = createLabelSchema.parse(req.body);
    const label = await labelService.create(req.project!, input);
    res.status(201).json({ label });
  },

  async bulkCreate(req: Request, res: Response) {
    const { labels } = bulkCreateLabelsSchema.parse(req.body);
    const created = await labelService.bulkCreate(req.project!, labels);
    res.status(201).json({ labels: created });
  },

  async update(req: Request, res: Response) {
    const input = updateLabelSchema.parse(req.body);
    const label = await labelService.update(req.project!, req.params.labelId!, input);
    res.json({ label });
  },

  async remove(req: Request, res: Response) {
    await labelService.remove(req.project!, req.params.labelId!);
    res.status(204).send();
  },
};
