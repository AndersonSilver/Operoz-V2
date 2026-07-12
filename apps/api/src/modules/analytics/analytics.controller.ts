import type { Request, Response } from "express";
import { analyticsService } from "./analytics.service.js";
import { adhocAnalyticsQuerySchema, createAnalyticViewSchema, updateAnalyticViewSchema } from "./analytics.schemas.js";

export const analyticsController = {
  async adhoc(req: Request, res: Response) {
    const input = adhocAnalyticsQuerySchema.parse(req.query);
    const rows = await analyticsService.adhoc(req.workspace!.id, input);
    res.json({ rows });
  },

  async defaultDashboard(req: Request, res: Response) {
    res.json(await analyticsService.defaultDashboard(req.workspace!.id));
  },

  async projectStats(req: Request, res: Response) {
    res.json({ projects: await analyticsService.projectStats(req.workspace!.id) });
  },

  async listViews(req: Request, res: Response) {
    res.json({ analyticViews: await analyticsService.listViews(req.workspace!.id) });
  },

  async createView(req: Request, res: Response) {
    const input = createAnalyticViewSchema.parse(req.body);
    const view = await analyticsService.createView(req.workspace!, input);
    res.status(201).json({ analyticView: view });
  },

  async updateView(req: Request, res: Response) {
    const input = updateAnalyticViewSchema.parse(req.body);
    const view = await analyticsService.findViewOrThrow(req.workspace!.id, req.params.viewId!);
    const updated = await analyticsService.updateView(view, input);
    res.json({ analyticView: updated });
  },

  async removeView(req: Request, res: Response) {
    const view = await analyticsService.findViewOrThrow(req.workspace!.id, req.params.viewId!);
    await analyticsService.removeView(view);
    res.status(204).send();
  },

  async runSavedView(req: Request, res: Response) {
    const view = await analyticsService.findViewOrThrow(req.workspace!.id, req.params.viewId!);
    const rows = await analyticsService.runSavedView(view);
    res.json({ rows });
  },
};
