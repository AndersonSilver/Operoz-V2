import type { Request, Response } from "express";
import { client360Service } from "./client-360.service.js";
import { healthSettingsService } from "./health-settings.service.js";
import { healthHistoryQuerySchema, updateHealthSettingsSchema } from "./client-360.schemas.js";

export const client360Controller = {
  async list(req: Request, res: Response) {
    const clients = await client360Service.listForBoard(req.board!);
    res.json({ clients });
  },

  async detail(req: Request, res: Response) {
    const client = await client360Service.detailForProject(req.board!, req.params.projectId!);
    res.json({ client });
  },

  async healthHistory(req: Request, res: Response) {
    const { weeks } = healthHistoryQuerySchema.parse(req.query);
    const history = await client360Service.healthHistory(req.params.projectId!, weeks);
    res.json({ history });
  },

  async getHealthSettings(req: Request, res: Response) {
    const settings = await healthSettingsService.getOrCreate(req.board!.id);
    res.json({ healthSettings: settings });
  },

  async updateHealthSettings(req: Request, res: Response) {
    const input = updateHealthSettingsSchema.parse(req.body);
    const settings = await healthSettingsService.update(req.board!.id, input);
    res.json({ healthSettings: settings });
  },
};
