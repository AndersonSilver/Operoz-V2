import type { Request, Response } from "express";
import { issueVersionService } from "./issue-version.service.js";

export const issueVersionController = {
  async listVersions(req: Request, res: Response) {
    const versions = await issueVersionService.listIssueVersions(req.issue!.id);
    res.json({ versions });
  },

  async listDescriptionVersions(req: Request, res: Response) {
    const versions = await issueVersionService.listDescriptionVersions(req.issue!.id);
    res.json({ versions });
  },

  async restoreDescriptionVersion(req: Request, res: Response) {
    const issue = await issueVersionService.restoreDescriptionVersion(req.issue!, req.params.versionId!);
    res.json({ issue });
  },
};
