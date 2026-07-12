import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { User } from "./user.entity.js";
import { decryptSecret, encryptSecret } from "../common/crypto.js";

export type OAuthProvider = "google" | "github" | "gitlab" | "gitea";

/**
 * Conta social vinculada (login OAuth). Tokens ficam sempre criptografados
 * em repouso — use os getters/setters abaixo, nunca leia/grave as colunas
 * *Encrypted diretamente.
 */
@Entity({ name: "accounts" })
@Index(["provider", "providerAccountId"], { unique: true })
export class Account extends BaseEntity {
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  provider!: OAuthProvider;

  @Column({ type: "text" })
  providerAccountId!: string;

  @Column({ type: "text", nullable: true })
  providerEmail!: string | null;

  @Column({ type: "text", nullable: true, select: false })
  accessTokenEncrypted!: string | null;

  @Column({ type: "text", nullable: true, select: false })
  refreshTokenEncrypted!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  tokenExpiresAt!: Date | null;

  set accessToken(value: string | null) {
    this.accessTokenEncrypted = value ? encryptSecret(value) : null;
  }

  get accessToken(): string | null {
    return this.accessTokenEncrypted ? decryptSecret(this.accessTokenEncrypted) : null;
  }

  set refreshToken(value: string | null) {
    this.refreshTokenEncrypted = value ? encryptSecret(value) : null;
  }

  get refreshToken(): string | null {
    return this.refreshTokenEncrypted ? decryptSecret(this.refreshTokenEncrypted) : null;
  }
}
