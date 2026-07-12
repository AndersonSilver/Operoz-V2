import type { ApiToken } from "../../entities/api-token.entity.js";

/** Nunca inclui o valor do token — só existe na resposta de criação, à parte. */
export function serializeApiToken(token: ApiToken) {
  return {
    id: token.id,
    label: token.label,
    description: token.description,
    tokenPrefix: token.tokenPrefix,
    isActive: token.isActive,
    isService: token.isService,
    lastUsedAt: token.lastUsedAt,
    expiresAt: token.expiresAt,
    createdAt: token.createdAt,
  };
}
