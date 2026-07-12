import type { Request, Response } from "express";
import { issueService } from "./issue.service.js";
import { serializeIssue } from "./issue.serializer.js";
import {
  bulkIssueIdsSchema,
  bulkUpdateIssuesSchema,
  createIssueSchema,
  listIssuesQuerySchema,
  updateIssueSchema,
} from "./issue.schemas.js";

async function serializeWithRelations(issue: Parameters<typeof serializeIssue>[0]) {
  const [assigneeIds, labelIds] = await Promise.all([
    issueService.getAssigneeIds(issue.id),
    issueService.getLabelIds(issue.id),
  ]);
  return serializeIssue(issue, { assigneeIds, labelIds });
}

export const issueController = {
  async list(req: Request, res: Response) {
    const filters = listIssuesQuerySchema.parse(req.query);
    const issues = await issueService.list(req.project!, filters);
    res.json({ issues: issues.map((i) => serializeIssue(i)) });
  },

  /** Guests não veem issues arquivadas — a rota exige MEMBER+ (ver issue.routes.ts). */
  async archivedList(req: Request, res: Response) {
    const filters = listIssuesQuerySchema.parse(req.query);
    const issues = await issueService.list(req.project!, { ...filters, isArchived: true });
    res.json({ issues: issues.map((i) => serializeIssue(i)) });
  },

  async create(req: Request, res: Response) {
    const input = createIssueSchema.parse(req.body);
    const issue = await issueService.create(req.project!, req.user!, input);
    res.status(201).json({ issue: await serializeWithRelations(issue) });
  },

  async detail(req: Request, res: Response) {
    res.json({ issue: await serializeWithRelations(req.issue!) });
  },

  async update(req: Request, res: Response) {
    const input = updateIssueSchema.parse(req.body);
    const issue = await issueService.update(req.project!, req.issue!, req.user!, input);
    res.json({ issue: await serializeWithRelations(issue) });
  },

  async remove(req: Request, res: Response) {
    await issueService.remove(req.project!, req.issue!, req.user!);
    res.status(204).send();
  },

  async archive(req: Request, res: Response) {
    const issue = await issueService.archive(req.project!, req.issue!);
    res.json({ issue: serializeIssue(issue) });
  },

  async unarchive(req: Request, res: Response) {
    const issue = await issueService.unarchive(req.project!, req.issue!);
    res.json({ issue: serializeIssue(issue) });
  },

  async meta(req: Request, res: Response) {
    res.json({ sequenceId: req.issue!.sequenceId, identifier: req.project!.identifier });
  },

  async listByIds(req: Request, res: Response) {
    const ids = String(req.query.issues ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const issues = await issueService.listByIds(req.project!, ids);
    res.json({ issues: issues.map((i) => serializeIssue(i)) });
  },

  async bulkUpdate(req: Request, res: Response) {
    const { issueIds, ...patch } = bulkUpdateIssuesSchema.parse(req.body);
    await issueService.bulkUpdate(req.project!, req.user!, issueIds, patch);
    res.status(204).send();
  },

  async bulkDelete(req: Request, res: Response) {
    const { issueIds } = bulkIssueIdsSchema.parse(req.body);
    await issueService.bulkDelete(req.project!, req.user!, issueIds);
    res.status(204).send();
  },

  async bulkArchive(req: Request, res: Response) {
    const { issueIds } = bulkIssueIdsSchema.parse(req.body);
    await issueService.bulkArchive(req.project!, issueIds);
    res.status(204).send();
  },
};

export const issueLookupController = {
  async search(req: Request, res: Response) {
    const query = String(req.query.q ?? "");
    const issues = await issueService.search(req.workspace!.id, query);
    res.json({ issues: issues.map((i) => serializeIssue(i)) });
  },

  async lookupByKey(req: Request, res: Response) {
    const sequenceId = Number(req.params.sequenceId);
    const issue = await issueService.lookupByKey(req.workspace!.id, req.params.identifier!, sequenceId);
    res.json({ issue: await serializeWithRelations(issue) });
  },
};
