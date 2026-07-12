import type { Request, Response } from "express";
import { cycleService } from "./cycle.service.js";
import { effectiveProjectRole } from "../projects/project.middleware.js";
import { WorkspaceRole } from "../../common/roles.js";
import {
  createCycleSchema,
  cycleIssuesSchema,
  dateCheckSchema,
  transferIssuesSchema,
  updateCycleSchema,
} from "./cycle.schemas.js";
import { ApiError } from "../../common/api-error.js";

export const cycleController = {
  async list(req: Request, res: Response) {
    const view = typeof req.query.view === "string" ? req.query.view : undefined;
    res.json({ cycles: await cycleService.list(req.project!, view) });
  },

  async listForWorkspace(req: Request, res: Response) {
    res.json({ cycles: await cycleService.listForWorkspace(req.workspace!.id, req.user!.id) });
  },

  async create(req: Request, res: Response) {
    const input = createCycleSchema.parse(req.body);
    const cycle = await cycleService.create(req.project!, req.user!, input);
    res.status(201).json({ cycle });
  },

  async dateCheck(req: Request, res: Response) {
    const input = dateCheckSchema.parse(req.body);
    const available = await cycleService.dateCheck(req.project!, input.startDate, input.endDate, input.excludeCycleId);
    res.json({ available });
  },

  async detail(req: Request, res: Response) {
    res.json({ cycle: req.cycle! });
  },

  async update(req: Request, res: Response) {
    const input = updateCycleSchema.parse(req.body);
    const cycle = await cycleService.update(req.cycle!, input);
    res.json({ cycle });
  },

  async remove(req: Request, res: Response) {
    const isWorkspaceAdmin = req.workspaceMember!.role >= WorkspaceRole.ADMIN;
    await cycleService.remove(req.project!, req.cycle!, req.user!, isWorkspaceAdmin, effectiveProjectRole(req));
    res.status(204).send();
  },

  async archive(req: Request, res: Response) {
    res.json({ cycle: await cycleService.archive(req.cycle!) });
  },

  async unarchive(req: Request, res: Response) {
    res.json({ cycle: await cycleService.unarchive(req.cycle!) });
  },

  async listArchived(req: Request, res: Response) {
    res.json({ cycles: await cycleService.listArchived(req.project!.id) });
  },

  async listIssues(req: Request, res: Response) {
    res.json({ issues: await cycleService.listIssues(req.cycle!.id) });
  },

  async addIssues(req: Request, res: Response) {
    const { issueIds } = cycleIssuesSchema.parse(req.body);
    await cycleService.addIssues(req.project!, req.cycle!, issueIds);
    res.status(204).send();
  },

  async removeIssue(req: Request, res: Response) {
    await cycleService.removeIssue(req.cycle!.id, req.params.issueId!);
    res.status(204).send();
  },

  async transferIssues(req: Request, res: Response) {
    const { targetCycleId } = transferIssuesSchema.parse(req.body);
    const target = await cycleService.findOrThrow(req.project!.id, targetCycleId);
    if (target.id === req.cycle!.id) {
      throw new ApiError(422, "same_cycle", "O ciclo de destino precisa ser diferente do ciclo atual.");
    }
    await cycleService.transferIssues(req.project!, req.cycle!, target);
    res.status(204).send();
  },

  async progress(req: Request, res: Response) {
    res.json(await cycleService.getProgress(req.cycle!));
  },

  async analytics(req: Request, res: Response) {
    res.json(await cycleService.getAnalytics(req.cycle!));
  },
};
