import type { Request, Response } from "express";
import { statusReportService } from "./status-report.service.js";
import { createStatusReportSchema, updateStatusReportSchema } from "./status-report.schemas.js";

export const statusReportController = {
  async list(req: Request, res: Response) {
    const reports = await statusReportService.list(req.project!.id);
    res.json({ statusReports: reports });
  },

  async create(req: Request, res: Response) {
    const input = createStatusReportSchema.parse(req.body);
    const report = await statusReportService.create(req.project!, req.user!, input);
    res.status(201).json({ statusReport: report });
  },

  async update(req: Request, res: Response) {
    const input = updateStatusReportSchema.parse(req.body);
    const report = await statusReportService.findOrThrow(req.project!.id, req.params.reportId!);
    const updated = await statusReportService.update(report, input);
    res.json({ statusReport: updated });
  },

  async publish(req: Request, res: Response) {
    const report = await statusReportService.findOrThrow(req.project!.id, req.params.reportId!);
    const published = await statusReportService.publish(report);
    res.json({ statusReport: published });
  },

  async remove(req: Request, res: Response) {
    const report = await statusReportService.findOrThrow(req.project!.id, req.params.reportId!);
    await statusReportService.remove(report);
    res.status(204).send();
  },
};
