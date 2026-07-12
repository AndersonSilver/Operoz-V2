import type { Workspace } from "../../entities/workspace.entity.js";
import type { WorkspaceMember } from "../../entities/workspace-member.entity.js";
import type { WorkspaceInvite } from "../../entities/workspace-invite.entity.js";

export function serializeWorkspace(workspace: Workspace, extra?: { role?: number; memberCount?: number }) {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    logoUrl: workspace.logoUrl,
    ownerId: workspace.ownerId,
    organizationSize: workspace.organizationSize,
    timezone: workspace.timezone,
    backgroundColor: workspace.backgroundColor,
    createdAt: workspace.createdAt,
    ...(extra?.role !== undefined ? { role: extra.role } : {}),
    ...(extra?.memberCount !== undefined ? { memberCount: extra.memberCount } : {}),
  };
}

export function serializeWorkspaceMember(member: WorkspaceMember, includeEmail: boolean) {
  return {
    id: member.id,
    userId: member.userId,
    role: member.role,
    companyRole: member.companyRole,
    isActive: member.isActive,
    joinedAt: member.createdAt,
    user: member.user
      ? {
          id: member.user.id,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          displayName: member.user.displayName ?? member.user.fullName,
          avatarUrl: member.user.avatarUrl,
          ...(includeEmail ? { email: member.user.email } : {}),
        }
      : undefined,
  };
}

export function serializeInvite(invite: WorkspaceInvite) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    message: invite.message,
    accepted: invite.accepted,
    respondedAt: invite.respondedAt,
    createdAt: invite.createdAt,
    workspace: invite.workspace
      ? { id: invite.workspace.id, name: invite.workspace.name, slug: invite.workspace.slug }
      : undefined,
  };
}
