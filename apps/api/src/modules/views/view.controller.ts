import type { Request, Response } from "express";
import { viewService } from "./view.service.js";
import { effectiveProjectRole } from "../projects/project.middleware.js";
import { WorkspaceRole } from "../../common/roles.js";
import { createViewSchema, updateViewSchema } from "./view.schemas.js";

export const projectViewController = {
  async list(req: Request, res: Response) {
    res.json({ views: await viewService.listForProject(req.project!.id) });
  },
  async create(req: Request, res: Response) {
    const input = createViewSchema.parse(req.body);
    const view = await viewService.createForProject(req.project!, req.user!, input);
    res.status(201).json({ view });
  },
  async detail(req: Request, res: Response) {
    const view = await viewService.findOrThrow(req.workspace!.id, req.params.viewId!);
    res.json({ view });
  },
  async update(req: Request, res: Response) {
    const input = updateViewSchema.parse(req.body);
    const view = await viewService.findOrThrow(req.workspace!.id, req.params.viewId!);
    const updated = await viewService.update(view, req.user!, input);
    res.json({ view: updated });
  },
  async remove(req: Request, res: Response) {
    const view = await viewService.findOrThrow(req.workspace!.id, req.params.viewId!);
    const isWorkspaceAdmin = req.workspaceMember!.role >= WorkspaceRole.ADMIN;
    await viewService.remove(view, req.user!, isWorkspaceAdmin, effectiveProjectRole(req));
    res.status(204).send();
  },
};

export const workspaceViewController = {
  async list(req: Request, res: Response) {
    res.json({ views: await viewService.listForWorkspace(req.workspace!.id) });
  },
  async create(req: Request, res: Response) {
    const input = createViewSchema.parse(req.body);
    const view = await viewService.createForWorkspace(req.workspace!, req.user!, input);
    res.status(201).json({ view });
  },
  async detail(req: Request, res: Response) {
    const view = await viewService.findOrThrow(req.workspace!.id, req.params.viewId!);
    res.json({ view });
  },
  async update(req: Request, res: Response) {
    const input = updateViewSchema.parse(req.body);
    const view = await viewService.findOrThrow(req.workspace!.id, req.params.viewId!);
    const updated = await viewService.update(view, req.user!, input);
    res.json({ view: updated });
  },
  async remove(req: Request, res: Response) {
    const view = await viewService.findOrThrow(req.workspace!.id, req.params.viewId!);
    const isWorkspaceAdmin = req.workspaceMember!.role >= WorkspaceRole.ADMIN;
    await viewService.remove(view, req.user!, isWorkspaceAdmin, -1);
    res.status(204).send();
  },
};
