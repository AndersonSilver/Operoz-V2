import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Project } from "./project.entity.js";
import { Workspace } from "./workspace.entity.js";
import { WorkspaceRole } from "../common/roles.js";

@Entity({ name: "project_invites" })
@Index(["projectId", "email"], { unique: true, where: '"deletedAt" IS NULL' })
export class ProjectInvite extends BaseEntity {
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

  @Column({ type: "citext" })
  email!: string;

  @Column({ type: "text" })
  token!: string;

  @Column({ type: "boolean", default: false })
  accepted!: boolean;

  @Column({ type: "text", nullable: true })
  message!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  respondedAt!: Date | null;

  @Column({ type: "smallint", default: WorkspaceRole.GUEST })
  role!: WorkspaceRole;
}
