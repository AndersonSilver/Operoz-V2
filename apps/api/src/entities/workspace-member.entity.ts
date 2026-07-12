import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";
import { WorkspaceRole } from "../common/roles.js";

@Entity({ name: "workspace_members" })
@Index(["workspaceId", "userId"], { unique: true, where: '"deletedAt" IS NULL' })
export class WorkspaceMember extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "smallint", default: WorkspaceRole.GUEST })
  role!: WorkspaceRole;

  @Column({ type: "text", nullable: true })
  companyRole!: string | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "jsonb", default: {} })
  viewProps!: Record<string, unknown>;

  @Column({ type: "jsonb", default: {} })
  issueProps!: Record<string, unknown>;
}
