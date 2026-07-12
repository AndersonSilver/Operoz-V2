import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";
import { User } from "./user.entity.js";

export enum ViewAccess {
  PRIVATE = 0,
  PUBLIC = 1,
}

/** `projectId` nulo = view de workspace inteiro; preenchido = view de projeto. */
@Entity({ name: "issue_views" })
export class IssueView extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "projectId" })
  project!: Project | null;

  @Column({ type: "uuid", nullable: true })
  projectId!: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "jsonb", default: {} })
  filters!: Record<string, unknown>;

  /** Derivado de `filters` a cada save — placeholder simples (passthrough) até existir um motor de query de filtros dedicado. */
  @Column({ type: "jsonb", default: {} })
  query!: Record<string, unknown>;

  @Column({ type: "jsonb", default: {} })
  displayFilters!: Record<string, unknown>;

  @Column({ type: "jsonb", default: {} })
  displayProperties!: Record<string, unknown>;

  @Column({ type: "smallint", default: ViewAccess.PUBLIC })
  access!: ViewAccess;

  @Column({ type: "double precision", default: 65535 })
  sortOrder!: number;

  @Column({ type: "jsonb", default: {} })
  logoProps!: Record<string, unknown>;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "ownedById" })
  ownedBy!: User;

  @Column({ type: "uuid" })
  ownedById!: string;

  @Column({ type: "boolean", default: false })
  isLocked!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt!: Date | null;
}
