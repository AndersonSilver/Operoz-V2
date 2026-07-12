import type { Request, Response } from "express";
import { projectService } from "./project.service.js";
import { effectiveProjectRole } from "./project.middleware.js";
import {
  acceptPendingProjectInvitesSchema,
  addProjectMembersSchema,
  createProjectInvitesSchema,
  createProjectSchema,
  favoriteSchema,
  identifierCheckQuerySchema,
  updateProjectMemberPreferencesSchema,
  updateProjectMemberRoleSchema,
  updateProjectSchema,
} from "./project.schemas.js";
import { serializeProject, serializeProjectInvite, serializeProjectMember } from "./project.serializer.js";
import { WorkspaceRole } from "../../common/roles.js";

export const projectController = {
  async list(req: Request, res: Response) {
    const projects = await projectService.listForWorkspace(req.workspace!.id, req.workspaceMember!.role, req.user!.id);
    res.json({ projects: projects.map((p) => serializeProject(p)) });
  },

  async create(req: Request, res: Response) {
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.create(req.workspace!, req.user!, input);
    res.status(201).json({ project: serializeProject(project, { role: WorkspaceRole.ADMIN }) });
  },

  async identifierCheck(req: Request, res: Response) {
    const { identifier } = identifierCheckQuerySchema.parse(req.query);
    const available = await projectService.isIdentifierAvailable(req.workspace!.id, identifier);
    res.json({ available });
  },

  async detail(req: Request, res: Response) {
    res.json({ project: serializeProject(req.project!, { role: effectiveProjectRole(req) }) });
  },

  async update(req: Request, res: Response) {
    const input = updateProjectSchema.parse(req.body);
    const project = await projectService.update(req.project!, input);
    res.json({ project: serializeProject(project) });
  },

  async remove(req: Request, res: Response) {
    await projectService.remove(req.project!);
    res.status(204).send();
  },

  async archive(req: Request, res: Response) {
    const project = await projectService.archive(req.project!);
    res.json({ project: serializeProject(project) });
  },

  async unarchive(req: Request, res: Response) {
    const project = await projectService.unarchive(req.project!);
    res.json({ project: serializeProject(project) });
  },

  // ---- Membros ----

  async listMembers(req: Request, res: Response) {
    const members = await projectService.listMembers(req.project!.id);
    res.json({ members: members.map((m) => serializeProjectMember(m)) });
  },

  async addMembers(req: Request, res: Response) {
    const { members } = addProjectMembersSchema.parse(req.body);
    const created = await projectService.addMembers(req.workspace!, req.project!, members);
    res.status(201).json({ members: created.map((m) => serializeProjectMember(m)) });
  },

  async updateMemberRole(req: Request, res: Response) {
    const { role } = updateProjectMemberRoleSchema.parse(req.body);
    const member = await projectService.updateMemberRole(req.project!, req.params.memberId!, role, {
      userId: req.user!.id,
      effectiveRole: effectiveProjectRole(req),
      isWorkspaceAdmin: req.workspaceMember!.role >= WorkspaceRole.ADMIN,
    });
    res.json({ member: serializeProjectMember(member) });
  },

  async removeMember(req: Request, res: Response) {
    await projectService.removeMember(req.project!, req.params.memberId!);
    res.status(204).send();
  },

  async leave(req: Request, res: Response) {
    if (!req.projectMember) {
      res.status(204).send();
      return;
    }
    await projectService.leaveProject(req.project!, req.projectMember);
    res.status(204).send();
  },

  async updateMyPreferences(req: Request, res: Response) {
    const { preferences } = updateProjectMemberPreferencesSchema.parse(req.body);
    const member = await projectService.updatePreferences(req.project!, req.user!.id, preferences);
    res.json({ member: serializeProjectMember(member) });
  },

  // ---- Convites ----

  async listInvites(req: Request, res: Response) {
    const invites = await projectService.listInvites(req.project!.id);
    res.json({ invitations: invites.map((i) => serializeProjectInvite(i)) });
  },

  async createInvites(req: Request, res: Response) {
    const { invites } = createProjectInvitesSchema.parse(req.body);
    const created = await projectService.createInvites(req.workspace!, req.project!, invites);
    res.status(201).json({ invitations: created.map((i) => serializeProjectInvite(i)) });
  },

  async removeInvite(req: Request, res: Response) {
    await projectService.removeInvite(req.project!, req.params.inviteId!);
    res.status(204).send();
  },

  // ---- Favoritos ----

  async listFavorites(req: Request, res: Response) {
    const favorites = await projectService.listFavorites(req.workspace!.id, req.user!.id, "project");
    res.json({ favorites });
  },

  async addFavorite(req: Request, res: Response) {
    const { entityType, entityId } = favoriteSchema.parse(req.body);
    const favorite = await projectService.addFavorite(req.workspace!.id, req.user!.id, entityType, entityId);
    res.status(201).json({ favorite });
  },

  async removeFavorite(req: Request, res: Response) {
    await projectService.removeFavorite(req.workspace!.id, req.user!.id, "project", req.params.entityId!);
    res.status(204).send();
  },
};

export const projectInviteController = {
  async preview(req: Request, res: Response) {
    const invite = await projectService.getInviteByToken(req.params.token!);
    res.json({ invitation: serializeProjectInvite(invite) });
  },

  async accept(req: Request, res: Response) {
    const project = await projectService.acceptInviteByToken(req.params.token!, req.user!);
    res.json({ project: serializeProject(project) });
  },

  async decline(req: Request, res: Response) {
    await projectService.declineInviteByToken(req.params.token!, req.user!);
    res.status(204).send();
  },

  async listMine(req: Request, res: Response) {
    const invites = await projectService.listPendingInvitesForUser(req.user!.email);
    res.json({ invitations: invites.map((i) => serializeProjectInvite(i)) });
  },

  async acceptMine(req: Request, res: Response) {
    const { inviteIds } = acceptPendingProjectInvitesSchema.parse(req.body);
    await projectService.acceptInvitesByIds(req.user!, inviteIds);
    res.status(204).send();
  },
};
