import argon2 from "argon2";
import { randomBytes, randomUUID } from "node:crypto";
import { User } from "../../entities/user.entity.js";
import { Profile } from "../../entities/profile.entity.js";
import { redis } from "../../common/redis.js";
import { emailService } from "../../common/email.service.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../common/api-error.js";

const MAGIC_LINK_TTL_SECONDS = 10 * 60;
const PASSWORD_RESET_TTL_SECONDS = 60 * 60;

class AuthService {
  async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  async signUp(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    const existing = await User.findOne({ where: { email: input.email } });
    if (existing) {
      throw new ApiError(409, "email_already_registered", "Este e-mail já está cadastrado.");
    }

    const passwordHash = await this.hashPassword(input.password);
    const user = User.create({
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      isEmailVerified: false,
    });
    await user.save();

    const profile = Profile.create({ userId: user.id });
    await profile.save();

    return user;
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        firstName: true,
        lastName: true,
      },
    });

    // Mesma mensagem de erro para "não existe" e "senha errada" — não
    // vazar quais e-mails têm conta cadastrada.
    const invalidCredentialsError = new ApiError(
      401,
      "invalid_credentials",
      "E-mail ou senha inválidos.",
    );

    if (!user || !user.passwordHash) {
      // Ainda faz um hash "de mentira" para gastar tempo equivalente e
      // dificultar user enumeration por timing.
      await argon2.hash(password).catch(() => undefined);
      throw invalidCredentialsError;
    }

    if (!user.isActive) {
      throw new ApiError(403, "account_disabled", "Esta conta está desativada.");
    }

    const isValid = await this.verifyPassword(user.passwordHash, password);
    if (!isValid) {
      throw invalidCredentialsError;
    }

    return user;
  }

  async recordLogin(user: User, ip: string | undefined): Promise<void> {
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip ?? null;
    await user.save();
  }

  // ---- Magic link (login sem senha) ----

  async requestMagicLink(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const token = randomUUID();
    await redis.set(
      `auth:magiclink:${token}`,
      normalizedEmail,
      "EX",
      MAGIC_LINK_TTL_SECONDS,
    );

    const url = `${env.WEB_URL}/auth/magic-link?token=${token}`;
    // Não revela se o e-mail existe ou não: sempre "sucesso" do ponto de
    // vista do chamador, envio real só ocorre se a conta existir.
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (user) {
      await emailService.sendMagicLink(normalizedEmail, url);
    }
  }

  async consumeMagicLink(token: string): Promise<User> {
    const key = `auth:magiclink:${token}`;
    const email = await redis.get(key);
    if (!email) {
      throw new ApiError(400, "invalid_or_expired_token", "Link inválido ou expirado.");
    }
    await redis.del(key); // uso único

    let user = await User.findOne({ where: { email } });
    if (!user) {
      // Primeiro acesso via magic link cria a conta automaticamente
      // (sem senha definida ainda).
      user = User.create({ email, firstName: "", lastName: "", isEmailVerified: true });
      await user.save();
      await Profile.create({ userId: user.id }).save();
    } else if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    if (!user.isActive) {
      throw new ApiError(403, "account_disabled", "Esta conta está desativada.");
    }

    return user;
  }

  // ---- Reset de senha ----

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return; // não revela se a conta existe

    const token = randomBytes(32).toString("hex");
    await redis.set(
      `auth:pwreset:${token}`,
      user.id,
      "EX",
      PASSWORD_RESET_TTL_SECONDS,
    );

    const url = `${env.WEB_URL}/auth/reset-password?token=${token}`;
    await emailService.sendPasswordReset(normalizedEmail, url);
  }

  async resetPassword(token: string, newPassword: string): Promise<User> {
    const key = `auth:pwreset:${token}`;
    const userId = await redis.get(key);
    if (!userId) {
      throw new ApiError(400, "invalid_or_expired_token", "Link de redefinição inválido ou expirado.");
    }
    await redis.del(key);

    const user = await User.findOneBy({ id: userId });
    if (!user) {
      throw new ApiError(404, "user_not_found", "Usuário não encontrado.");
    }

    user.passwordHash = await this.hashPassword(newPassword);
    await user.save();

    // Invalida todas as sessões ativas — troca de senha derruba todos os
    // dispositivos logados, inclusive o atacante se a conta foi comprometida.
    await this.revokeAllSessions(user.id);

    return user;
  }

  async changePassword(user: User, currentPassword: string, newPassword: string): Promise<void> {
    if (!user.passwordHash) {
      throw new ApiError(400, "no_password_set", "Esta conta ainda não tem senha definida.");
    }
    const isValid = await this.verifyPassword(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new ApiError(401, "invalid_current_password", "Senha atual incorreta.");
    }
    user.passwordHash = await this.hashPassword(newPassword);
    await user.save();
  }

  // ---- Sessões ----

  /** Remove todas as sessões Redis do usuário (logout de todos os dispositivos). */
  async revokeAllSessions(userId: string): Promise<void> {
    const pattern = "operoz:sess:*";
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const keysToCheck: string[] = [];
    for await (const keys of stream) {
      keysToCheck.push(...(keys as string[]));
    }
    if (keysToCheck.length === 0) return;

    const pipeline = redis.pipeline();
    for (const key of keysToCheck) pipeline.get(key);
    const results = await pipeline.exec();

    const keysToDelete: string[] = [];
    results?.forEach(([, value], index) => {
      if (typeof value === "string" && value.includes(`"userId":"${userId}"`)) {
        keysToDelete.push(keysToCheck[index]!);
      }
    });

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }
  }
}

export const authService = new AuthService();
