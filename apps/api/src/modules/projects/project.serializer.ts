import type { Project } from "../../entities/project.entity.js";
import type { ProjectMember } from "../../entities/project-member.entity.js";
import type { ProjectInvite } from "../../entities/project-invite.entity.js";

export function serializeProject(project: Project, extra?: { role?: number }) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    identifier: project.identifier,
    network: project.network,
    workspaceId: project.workspaceId,
    projectLeadId: project.projectLeadId,
    defaultAssigneeId: project.defaultAssigneeId,
    emoji: project.emoji,
    logoProps: project.logoProps,
    coverImageUrl: project.coverImageUrl,
    moduleView: project.moduleView,
    cycleView: project.cycleView,
    issueViewsView: project.issueViewsView,
    pageView: project.pageView,
    intakeView: project.intakeView,
    supportView: project.supportView,
    isTimeTrackingEnabled: project.isTimeTrackingEnabled,
    guestViewAllFeatures: project.guestViewAllFeatures,
    archiveIn: project.archiveIn,
    closeIn: project.closeIn,
    timezone: project.timezone,
    archivedAt: project.archivedAt,
    createdAt: project.createdAt,
    ...(extra?.role !== undefined ? { role: extra.role } : {}),
  };
}

export function serializeProjectMember(member: ProjectMember) {
  return {
    id: member.id,
    userId: member.userId,
    role: member.role,
    isActive: member.isActive,
    sortOrder: member.sortOrder,
    joinedAt: member.createdAt,
    user: member.user
      ? {
          id: member.user.id,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          displayName: member.user.displayName ?? member.user.fullName,
          avatarUrl: member.user.avatarUrl,
          email: member.user.email,
        }
      : undefined,
  };
}

export function serializeProjectInvite(invite: ProjectInvite) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    message: invite.message,
    accepted: invite.accepted,
    respondedAt: invite.respondedAt,
    createdAt: invite.createdAt,
    project: invite.project
      ? { id: invite.project.id, name: invite.project.name, identifier: invite.project.identifier }
      : undefined,
  };
}
