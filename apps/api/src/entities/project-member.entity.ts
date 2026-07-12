import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Project } from "./project.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";
import { WorkspaceRole } from "../common/roles.js";

@Entity({ name: "project_members" })
@Index(["projectId", "userId"], { unique: true, where: '"deletedAt" IS NULL' })
export class ProjectMember extends BaseEntity {
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

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "smallint", default: WorkspaceRole.GUEST })
  role!: WorkspaceRole;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "double precision", default: 65535 })
  sortOrder!: number;

  @Column({ type: "jsonb", default: {} })
  viewProps!: Record<string, unknown>;

  @Column({
    type: "jsonb",
    default: { pages: { blockDisplay: true }, navigation: { defaultTab: "work_items", hideInMoreMenu: [] } },
  })
  preferences!: Record<string, unknown>;
}
