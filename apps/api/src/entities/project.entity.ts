import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

export enum ProjectNetwork {
  SECRET = 0,
  PUBLIC = 2,
}

@Entity({ name: "projects" })
@Index(["workspaceId", "name"], { unique: true, where: '"deletedAt" IS NULL' })
@Index(["workspaceId", "identifier"], { unique: true, where: '"deletedAt" IS NULL' })
export class Project extends BaseEntity {
  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "jsonb", nullable: true })
  descriptionText!: Record<string, unknown> | null;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @Column({ type: "text" })
  identifier!: string;

  @Column({ type: "smallint", default: ProjectNetwork.PUBLIC })
  network!: ProjectNetwork;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "projectLeadId" })
  projectLead!: User | null;

  @Column({ type: "uuid", nullable: true })
  projectLeadId!: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "defaultAssigneeId" })
  defaultAssignee!: User | null;

  @Column({ type: "uuid", nullable: true })
  defaultAssigneeId!: string | null;

  @Column({ type: "text", nullable: true })
  emoji!: string | null;

  @Column({ type: "jsonb", nullable: true })
  iconProp!: Record<string, unknown> | null;

  @Column({ type: "jsonb", default: {} })
  logoProps!: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  coverImageUrl!: string | null;

  @Column({ type: "boolean", default: true })
  moduleView!: boolean;

  @Column({ type: "boolean", default: true })
  cycleView!: boolean;

  @Column({ type: "boolean", default: true })
  issueViewsView!: boolean;

  @Column({ type: "boolean", default: true })
  pageView!: boolean;

  @Column({ type: "boolean", default: true })
  intakeView!: boolean;

  @Column({ type: "boolean", default: true })
  supportView!: boolean;

  @Column({ type: "boolean", default: false })
  isTimeTrackingEnabled!: boolean;

  @Column({ type: "boolean", default: false })
  guestViewAllFeatures!: boolean;

  @Column({ type: "int", default: 0 })
  archiveIn!: number;

  @Column({ type: "int", default: 0 })
  closeIn!: number;

  @Column({ type: "text", default: "UTC" })
  timezone!: string;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  defaultStateId!: string | null;

  @Column({ type: "uuid", nullable: true })
  estimateId!: string | null;
}
