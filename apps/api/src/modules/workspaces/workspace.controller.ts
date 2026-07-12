import type { Request, Response } from "express";
import { workspaceService } from "./workspace.service.js";
import {
  acceptPendingInvitesSchema,
  createInvitesSchema,
  createWorkspaceSchema,
  slugCheckQuerySchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
  updateUserPropertiesSchema,
  updateWorkspaceSchema,
  workspaceThemeSchema,
} from "./workspace.schemas.js";
import {
  serializeInvite,
  serializeWorkspace,
  serializeWorkspaceMember,
} from "./workspace.serializer.js";
import { WorkspaceRole } from "../../common/roles.js";

export const workspaceController = {
  async list(req: Request, res: Response) {
    const rows = await workspaceService.listForUser(req.user!.id);
    res.json({
      workspaces: rows.map((r) => serializeWorkspace(r.workspace, { role: r.role, memberCount: r.memberCount })),
    });
  },

  async create(req: Request, res: Response) {
    const input = createWorkspaceSchema.parse(req.body);
    const workspace = await workspaceService.create(req.user!, input);
    res.status(201).json({ workspace: serializeWorkspace(workspace, { role: WorkspaceRole.ADMIN, memberCount: 1 }) });
  },

  async slugCheck(req: Request, res: Response) {
    const { slug } = slugCheckQuerySchema.parse(req.query);
    const available = await workspaceService.isSlugAvailable(slug);
    res.json({ available });
  },

  async detail(req: Request, res: Response) {
    res.json({ workspace: serializeWorkspace(req.workspace!, { role: req.workspaceMember!.role }) });
  },

  async update(req: Request, res: Response) {
    const input = updateWorkspaceSchema.parse(req.body);
    const workspace = await workspaceService.update(req.workspace!, input);
    res.json({ workspace: serializeWorkspace(workspace) });
  },

  async remove(req: Request, res: Response) {
    await workspaceService.remove(req.workspace!);
    res.status(204).send();
  },

  async transferOwnership(req: Request, res: Response) {
    const { newOwnerUserId } = transferOwnershipSchema.parse(req.body);
    const workspace = await workspaceService.transferOwnership(req.workspace!, req.user!, newOwnerUserId);
    res.json({ workspace: serializeWorkspace(workspace) });
  },

  // ---- Membros ----

  async listMembers(req: Request, res: Response) {
    const members = await workspaceService.listMembers(req.workspace!.id);
    const includeEmail = req.workspaceMember!.role >= WorkspaceRole.ADMIN;
    res.json({ members: members.map((m) => serializeWorkspaceMember(m, includeEmail)) });
  },

  async updateMemberRole(req: Request, res: Response) {
    const { role } = updateMemberRoleSchema.parse(req.body);
    const member = await workspaceService.updateMemberRole(
      req.workspace!,
      req.params.memberId!,
      role,
      req.workspaceMember!,
    );
    res.json({ member: serializeWorkspaceMember(member, true) });
  },

  async removeMember(req: Request, res: Response) {
    await workspaceService.removeMember(req.workspace!, req.params.memberId!);
    res.status(204).send();
  },

  async leave(req: Request, res: Response) {
    await workspaceService.leave(req.workspace!, req.workspaceMember!);
    res.status(204).send();
  },

  // ---- Convites ----

  async listInvites(req: Request, res: Response) {
    const invites = await workspaceService.listInvites(req.workspace!.id);
    res.json({ invitations: invites.map((i) => serializeInvite(i)) });
  },

  async createInvites(req: Request, res: Response) {
    const { invites } = createInvitesSchema.parse(req.body);
    const created = await workspaceService.createInvites(req.workspace!, req.user!, invites);
    res.status(201).json({ invitations: created.map((i) => serializeInvite(i)) });
  },

  async removeInvite(req: Request, res: Response) {
    await workspaceService.removeInvite(req.workspace!, req.params.inviteId!);
    res.status(204).send();
  },

  // ---- Preferências de UI ----

  async getUserProperties(req: Request, res: Response) {
    const props = await workspaceService.getOrCreateUserProperties(req.workspace!.id, req.user!.id);
    res.json({ properties: props });
  },

  async updateUserProperties(req: Request, res: Response) {
    const input = updateUserPropertiesSchema.parse(req.body);
    const props = await workspaceService.updateUserProperties(req.workspace!.id, req.user!.id, input);
    res.json({ properties: props });
  },

  // ---- Temas ----

  async listThemes(req: Request, res: Response) {
    const themes = await workspaceService.listThemes(req.workspace!.id);
    res.json({ themes });
  },

  async createTheme(req: Request, res: Response) {
    const input = workspaceThemeSchema.parse(req.body);
    const theme = await workspaceService.createTheme(req.workspace!.id, req.user!.id, input);
    res.status(201).json({ theme });
  },

  async updateTheme(req: Request, res: Response) {
    const input = workspaceThemeSchema.partial().parse(req.body);
    const theme = await workspaceService.updateTheme(req.workspace!.id, req.params.themeId!, input);
    res.json({ theme });
  },

  async removeTheme(req: Request, res: Response) {
    await workspaceService.removeTheme(req.workspace!.id, req.params.themeId!);
    res.status(204).send();
  },
};

export const workspaceInviteController = {
  async preview(req: Request, res: Response) {
    const invite = await workspaceService.getInviteByToken(req.params.token!);
    res.json({ invitation: serializeInvite(invite) });
  },

  async accept(req: Request, res: Response) {
    const workspace = await workspaceService.acceptInviteByToken(req.params.token!, req.user!);
    res.json({ workspace: serializeWorkspace(workspace) });
  },

  async decline(req: Request, res: Response) {
    await workspaceService.declineInviteByToken(req.params.token!, req.user!);
    res.status(204).send();
  },

  async listMine(req: Request, res: Response) {
    const invites = await workspaceService.listPendingInvitesForUser(req.user!.email);
    res.json({ invitations: invites.map((i) => serializeInvite(i)) });
  },

  async acceptMine(req: Request, res: Response) {
    const { inviteIds } = acceptPendingInvitesSchema.parse(req.body);
    await workspaceService.acceptInvitesByIds(req.user!, inviteIds);
    res.status(204).send();
  },
};
