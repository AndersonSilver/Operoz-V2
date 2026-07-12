import type { Request, Response } from "express";
import { exportService } from "./export.service.js";
import { createIssueExportSchema } from "./export.schemas.js";

const CONTENT_TYPE: Record<string, string> = { csv: "text/csv", json: "application/json" };

export const exportController = {
  async listHistory(req: Request, res: Response) {
    res.json({ exports: await exportService.listHistory(req.workspace!.id) });
  },

  async createIssueExport(req: Request, res: Response) {
    const input = createIssueExportSchema.parse(req.body);
    const history = await exportService.createIssueExport(req.workspace!, req.user!, input);
    res.status(200).json({ export: history });
  },

  async download(req: Request, res: Response) {
    const history = await exportService.findOrThrow(req.workspace!.id, req.params.exportId!);
    const buffer = await exportService.downloadFile(history);
    res.setHeader("content-type", CONTENT_TYPE[history.provider] ?? "application/octet-stream");
    res.setHeader("content-disposition", `attachment; filename="export-${history.token.slice(0, 8)}.${history.provider}"`);
    res.send(buffer);
  },

  async exportUserActivity(req: Request, res: Response) {
    const csv = await exportService.exportUserActivityCsv(req.workspace!.id, req.params.userId!);
    res.setHeader("content-type", "text/csv");
    res.setHeader("content-disposition", `attachment; filename="user-activity-${req.params.userId}.csv"`);
    res.send(csv);
  },
};
