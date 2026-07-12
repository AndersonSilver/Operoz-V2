import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { User } from "./user.entity.js";

/**
 * Correção consciente vs. original: guardamos só o hash SHA-256 do
 * token (`tokenHash`), nunca o valor puro — o original fazia lookup
 * direto por `WHERE token = <valor>` em texto plano. O valor completo
 * só existe no momento da criação (retornado uma única vez ao cliente,
 * como um GitHub PAT); `tokenPrefix` guarda só os primeiros caracteres
 * para o usuário reconhecer o token na listagem.
 */
@Entity({ name: "api_tokens" })
@Index(["tokenHash"], { unique: true })
export class ApiToken extends BaseEntity {
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  label!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "text" })
  tokenHash!: string;

  @Column({ type: "text" })
  tokenPrefix!: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: false })
  isService!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt!: Date | null;
}
