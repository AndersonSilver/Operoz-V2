import { ApiToken } from "../../entities/api-token.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { generateApiTokenValue, hashApiToken, tokenDisplayPrefix } from "./api-token-crypto.js";

class ApiTokenService {
  async list(userId: string) {
    return ApiToken.find({ where: { userId }, order: { createdAt: "DESC" } });
  }

  async findOrThrow(userId: string, tokenId: string): Promise<ApiToken> {
    const token = await ApiToken.findOne({ where: { id: tokenId, userId } });
    if (!token) {
      throw new ApiError(404, "api_token_not_found", "Token não encontrado.");
    }
    return token;
  }

  /** Retorna `{ token, rawValue }` — `rawValue` só existe aqui, nunca mais é recuperável depois. */
  async create(
    user: User,
    input: { label?: string; description?: string | null; expiresAt?: Date | null },
  ): Promise<{ token: ApiToken; rawValue: string }> {
    const rawValue = generateApiTokenValue();
    const token = ApiToken.create({
      userId: user.id,
      label: input.label && input.label.length > 0 ? input.label : `token-${Date.now()}`,
      description: input.description ?? null,
      tokenHash: hashApiToken(rawValue),
      tokenPrefix: tokenDisplayPrefix(rawValue),
      expiresAt: input.expiresAt ?? null,
    });
    await token.save();
    return { token, rawValue };
  }

  async update(token: ApiToken, input: { label?: string; description?: string | null; expiresAt?: Date | null }) {
    Object.assign(token, input);
    await token.save();
    return token;
  }

  async revoke(token: ApiToken): Promise<void> {
    await token.softRemove();
  }

  /** Fire-and-forget: não deve atrasar a resposta da request autenticada. */
  async touchLastUsed(token: ApiToken): Promise<void> {
    token.lastUsedAt = new Date();
    await token.save();
  }
}

export const apiTokenService = new ApiTokenService();
