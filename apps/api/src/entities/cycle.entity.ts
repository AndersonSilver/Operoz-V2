import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";
import { User } from "./user.entity.js";

/**
 * Diferença consciente vs. original: delete é soft (`deletedAt`), não
 * hard delete — o original tinha um TODO reconhecendo isso como dívida.
 * Também não reforçamos bloqueio de overlap de datas no create/update
 * (só o preflight `date-check`), replicando o comportamento original.
 */
@Entity({ name: "cycles" })
export class Cycle extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "timestamptz", nullable: true })
  startDate!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  endDate!: Date | null;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "ownedById" })
  ownedBy!: User;

  @Column({ type: "uuid" })
  ownedById!: string;

  @Column({ type: "double precision", default: 65535 })
  sortOrder!: number;

  @Column({ type: "jsonb", default: {} })
  progressSnapshot!: Record<string, unknown>;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt!: Date | null;
}
