import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

/**
 * `secretEncrypted` guarda o segredo cifrado (AES-256-GCM, mesma
 * infraestrutura usada para tokens OAuth) — diferente de senha, aqui
 * precisamos do valor reversível de volta para assinar cada payload
 * HMAC no envio, então hash puro (irreversível) não serve.
 */
@Entity({ name: "webhooks" })
@Index(["workspaceId", "url"], { unique: true, where: '"deletedAt" IS NULL' })
export class Webhook extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "createdById" })
  createdBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  createdById!: string | null;

  @Column({ type: "text" })
  url!: string;

  @Column({ type: "text" })
  secretEncrypted!: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: true })
  eventProject!: boolean;

  @Column({ type: "boolean", default: true })
  eventIssue!: boolean;

  @Column({ type: "boolean", default: true })
  eventModule!: boolean;

  @Column({ type: "boolean", default: true })
  eventCycle!: boolean;

  @Column({ type: "boolean", default: true })
  eventIssueComment!: boolean;

  @Column({ type: "int", default: 0 })
  consecutiveFailures!: number;
}
