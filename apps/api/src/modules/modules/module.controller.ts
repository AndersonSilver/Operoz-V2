import type { Request, Response } from "express";
import { moduleService } from "./module.service.js";
import { effectiveProjectRole } from "../projects/project.middleware.js";
import { WorkspaceRole } from "../../common/roles.js";
import {
  createModuleSchema,
  moduleIssuesSchema,
  moduleLinkSchema,
  setIssueModulesSchema,
  updateModuleSchema,
} from "./module.schemas.js";

export const moduleController = {
  async list(req: Request, res: Response) {
    res.json({ modules: await moduleService.list(req.project!.id) });
  },
  async listForWorkspace(req: Request, res: Response) {
    res.json({ modules: await moduleService.listForWorkspace(req.workspace!.id, req.user!.id) });
  },
  async create(req: Request, res: Response) {
    const input = createModuleSchema.parse(req.body);
    const mod = await moduleService.create(req.project!, req.user!, input);
    res.status(201).json({ module: mod });
  },
  async detail(req: Request, res: Response) {
    res.json({ module: req.projectModule! });
  },
  async update(req: Request, res: Response) {
    const input = updateModuleSchema.parse(req.body);
    const mod = await moduleService.update(req.projectModule!, input);
    res.json({ module: mod });
  },
  async remove(req: Request, res: Response) {
    const isWorkspaceAdmin = req.workspaceMember!.role >= WorkspaceRole.ADMIN;
    await moduleService.remove(req.projectModule!, req.user!, isWorkspaceAdmin, effectiveProjectRole(req));
    res.status(204).send();
  },
  async archive(req: Request, res: Response) {
    res.json({ module: await moduleService.archive(req.projectModule!) });
  },
  async unarchive(req: Request, res: Response) {
    res.json({ module: await moduleService.unarchive(req.projectModule!) });
  },
  async listArchived(req: Request, res: Response) {
    res.json({ modules: await moduleService.listArchived(req.project!.id) });
  },
  async listIssues(req: Request, res: Response) {
    res.json({ issues: await moduleService.listIssues(req.projectModule!.id) });
  },
  async addIssues(req: Request, res: Response) {
    const { issueIds } = moduleIssuesSchema.parse(req.body);
    await moduleService.addIssues(req.project!, req.projectModule!, issueIds);
    res.status(204).send();
  },
  async removeIssue(req: Request, res: Response) {
    await moduleService.removeIssue(req.projectModule!.id, req.params.issueId!);
    res.status(204).send();
  },
  async progress(req: Request, res: Response) {
    res.json(await moduleService.computeProgress(req.projectModule!.id));
  },
  async listLinks(req: Request, res: Response) {
    res.json({ links: await moduleService.listLinks(req.projectModule!.id) });
  },
  async addLink(req: Request, res: Response) {
    const input = moduleLinkSchema.parse(req.body);
    res.status(201).json({ link: await moduleService.addLink(req.projectModule!.id, input) });
  },
  async removeLink(req: Request, res: Response) {
    await moduleService.removeLink(req.projectModule!.id, req.params.linkId!);
    res.status(204).send();
  },
};

export const issueModulesController = {
  async set(req: Request, res: Response) {
    const { moduleIds } = setIssueModulesSchema.parse(req.body);
    await moduleService.setIssueModules(req.project!.id, req.issue!.id, moduleIds);
    res.status(204).send();
  },
};
