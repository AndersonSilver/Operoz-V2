import type { Request, Response } from "express";
import { estimateService } from "./estimate.service.js";
import {
  createEstimatePointSchema,
  createEstimateSchema,
  updateEstimatePointSchema,
  updateEstimateSchema,
} from "./estimate.schemas.js";

export const estimateController = {
  async list(req: Request, res: Response) {
    const estimates = await estimateService.list(req.project!.id);
    res.json({ estimates });
  },

  async listForWorkspace(req: Request, res: Response) {
    const estimates = await estimateService.listForWorkspace(req.workspace!.id, req.user!.id);
    res.json({ estimates });
  },

  async detail(req: Request, res: Response) {
    const estimate = await estimateService.findOrThrow(req.project!.id, req.params.estimateId!);
    res.json({ estimate });
  },

  async create(req: Request, res: Response) {
    const input = createEstimateSchema.parse(req.body);
    const estimate = await estimateService.create(req.project!, input);
    res.status(201).json({ estimate });
  },

  async update(req: Request, res: Response) {
    const input = updateEstimateSchema.parse(req.body);
    const estimate = await estimateService.update(req.project!, req.params.estimateId!, input);
    res.json({ estimate });
  },

  async remove(req: Request, res: Response) {
    await estimateService.remove(req.project!, req.params.estimateId!);
    res.status(204).send();
  },

  async activate(req: Request, res: Response) {
    const estimate = await estimateService.activate(req.project!, req.params.estimateId!);
    res.json({ estimate });
  },

  async deactivate(req: Request, res: Response) {
    await estimateService.deactivate(req.project!);
    res.status(204).send();
  },

  async activePoints(req: Request, res: Response) {
    const points = await estimateService.getActivePoints(req.project!);
    res.json({ points });
  },

  async addPoint(req: Request, res: Response) {
    const input = createEstimatePointSchema.parse(req.body);
    const point = await estimateService.addPoint(req.project!, req.params.estimateId!, input);
    res.status(201).json({ point });
  },

  async updatePoint(req: Request, res: Response) {
    const input = updateEstimatePointSchema.parse(req.body);
    const point = await estimateService.updatePoint(
      req.project!,
      req.params.estimateId!,
      req.params.pointId!,
      input,
    );
    res.json({ point });
  },

  async removePoint(req: Request, res: Response) {
    await estimateService.removePoint(req.project!, req.params.estimateId!, req.params.pointId!);
    res.status(204).send();
  },
};
