import type { Request, Response } from "express";
import { draftIssueService } from "./draft-issue.service.js";
import { projectService } from "../projects/project.service.js";
import { ApiError } from "../../common/api-error.js";
import { createDraftIssueSchema, updateDraftIssueSchema } from "./issue.schemas.js";
import { serializeIssue } from "./issue.serializer.js";

async function loadProjectForDraft(req: Request, projectId: string) {
  const project = await projectService.findByIdOrThrow(req.workspace!.id, projectId);
  const isWorkspaceAdmin = req.workspaceMember!.role >= 20;
  if (!isWorkspaceAdmin) {
    const membership = await projectService.getMembership(project.id, req.user!.id);
    if (!membership) {
      throw new ApiError(403, "not_a_member", "Você não é membro deste projeto.");
    }
  }
  return project;
}

export const draftIssueController = {
  async listMine(req: Request, res: Response) {
    const drafts = await draftIssueService.listMine(req.workspace!.id, req.user!.id);
    res.json({ draftIssues: drafts });
  },

  async create(req: Request, res: Response) {
    const projectId = String(req.body.projectId ?? "");
    if (!projectId) throw new ApiError(422, "project_id_required", "projectId é obrigatório.");
    const project = await loadProjectForDraft(req, projectId);
    const input = createDraftIssueSchema.parse(req.body);
    const draft = await draftIssueService.create(project, req.user!, input);
    res.status(201).json({ draftIssue: draft });
  },

  async detail(req: Request, res: Response) {
    const draft = await draftIssueService.findOrThrow(req.workspace!.id, req.user!.id, req.params.draftId!);
    res.json({ draftIssue: draft });
  },

  async update(req: Request, res: Response) {
    const draft = await draftIssueService.findOrThrow(req.workspace!.id, req.user!.id, req.params.draftId!);
    const input = updateDraftIssueSchema.parse(req.body);
    const updated = await draftIssueService.update(draft, input);
    res.json({ draftIssue: updated });
  },

  async remove(req: Request, res: Response) {
    const draft = await draftIssueService.findOrThrow(req.workspace!.id, req.user!.id, req.params.draftId!);
    await draftIssueService.remove(draft);
    res.status(204).send();
  },

  async publish(req: Request, res: Response) {
    const draft = await draftIssueService.findOrThrow(req.workspace!.id, req.user!.id, req.params.draftId!);
    const project = await loadProjectForDraft(req, draft.projectId);
    const issue = await draftIssueService.publish(project, draft, req.user!);
    res.status(201).json({ issue: serializeIssue(issue) });
  },
};
