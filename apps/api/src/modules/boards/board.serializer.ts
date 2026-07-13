import { BoardMember } from "../../entities/board-member.entity.js";

export function serializeBoardMember(member: BoardMember) {
  return {
    id: member.id,
    userId: member.userId,
    role: member.role,
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
