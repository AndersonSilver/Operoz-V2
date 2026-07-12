import type { Request, Response } from "express";
import { pageService } from "./page.service.js";
import { effectiveProjectRole } from "../projects/project.middleware.js";
import { WorkspaceRole } from "../../common/roles.js";
import {
  changePageAccessSchema,
  createPageSchema,
  updatePageDescriptionSchema,
  updatePageSchema,
} from "./page.schemas.js";

function role(req: Request): WorkspaceRole {
  return Math.max(effectiveProjectRole(req), WorkspaceRole.GUEST) as WorkspaceRole;
}

export const pageController = {
  async list(req: Request, res: Response) {
    res.json({ pages: await pageService.list(req.project!, req.user!.id) });
  },
  async summary(req: Request, res: Response) {
    res.json(await pageService.summary(req.project!, req.user!.id));
  },
  async create(req: Request, res: Response) {
    const input = createPageSchema.parse(req.body);
    const page = await pageService.create(req.project!, req.user!, input);
    res.status(201).json({ page });
  },
  async detail(req: Request, res: Response) {
    res.json({ page: req.page! });
  },
  async update(req: Request, res: Response) {
    const input = updatePageSchema.parse(req.body);
    const page = await pageService.update(req.page!, req.user!, role(req), input);
    res.json({ page });
  },
  async changeAccess(req: Request, res: Response) {
    const { access } = changePageAccessSchema.parse(req.body);
    const page = await pageService.changeAccess(req.page!, req.user!, access);
    res.json({ page });
  },
  async updateDescription(req: Request, res: Response) {
    const input = updatePageDescriptionSchema.parse(req.body);
    const page = await pageService.updateDescription(req.page!, req.user!, role(req), input);
    res.json({ page });
  },
  async remove(req: Request, res: Response) {
    await pageService.remove(req.page!, role(req));
    res.status(204).send();
  },
  async archive(req: Request, res: Response) {
    res.json({ page: await pageService.archive(req.page!) });
  },
  async unarchive(req: Request, res: Response) {
    res.json({ page: await pageService.unarchive(req.page!) });
  },
  async lock(req: Request, res: Response) {
    res.json({ page: await pageService.lock(req.page!) });
  },
  async unlock(req: Request, res: Response) {
    if (role(req) < WorkspaceRole.ADMIN) {
      res.status(403).json({ error: { code: "insufficient_permission", message: "Só Admin pode desbloquear." } });
      return;
    }
    res.json({ page: await pageService.unlock(req.page!) });
  },
  async duplicate(req: Request, res: Response) {
    const page = await pageService.duplicate(req.project!, req.page!, req.user!);
    res.status(201).json({ page });
  },
  async listVersions(req: Request, res: Response) {
    res.json({ versions: await pageService.listVersions(req.page!.id) });
  },
  async restoreVersion(req: Request, res: Response) {
    const page = await pageService.restoreVersion(req.page!, req.params.versionId!);
    res.json({ page });
  },
};
