import type { User } from "../../entities/user.entity.js";

/**
 * Nunca serializa passwordHash nem qualquer campo sensível — este é o
 * único lugar autorizado a decidir o que do User vai para o cliente.
 */
export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName ?? user.fullName,
    avatarUrl: user.avatarUrl,
    isEmailVerified: user.isEmailVerified,
    timezone: user.timezone,
    language: user.language,
    createdAt: user.createdAt,
  };
}
