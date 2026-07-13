import { TeamMember } from "../../entities/team-member.entity.js";

export function serializeTeamMember(member: TeamMember) {
  return {
    id: member.id,
    userId: member.userId,
    user: member.user
      ? {
          id: member.user.id,
          email: member.user.email,
          displayName: member.user.displayName,
          avatarUrl: member.user.avatarUrl,
        }
      : null,
    createdAt: member.createdAt,
  };
}
