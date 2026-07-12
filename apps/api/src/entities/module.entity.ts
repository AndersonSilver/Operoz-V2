import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";
import { User } from "./user.entity.js";

export type ModuleStatus = "backlog" | "planned" | "in-progress" | "paused" | "completed" | "cancelled";

@Entity({ name: "modules" })
@Index(["projectId", "name"], { unique: true, where: '"deletedAt" IS NULL' })
export class ProjectModule extends BaseEntity {
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

  @Column({ type: "date", nullable: true })
  startDate!: string | null;

  @Column({ type: "date", nullable: true })
  targetDate!: string | null;

  @Column({ type: "text", default: "planned" })
  status!: ModuleStatus;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "leadId" })
  lead!: User | null;

  @Column({ type: "uuid", nullable: true })
  leadId!: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "createdById" })
  createdBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  createdById!: string | null;

  @Column({ type: "double precision", default: 65535 })
  sortOrder!: number;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt!: Date | null;
}
