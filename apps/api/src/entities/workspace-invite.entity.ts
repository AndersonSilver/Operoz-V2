import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { WorkspaceRole } from "../common/roles.js";

@Entity({ name: "workspace_invites" })
@Index(["workspaceId", "email"], { unique: true, where: '"deletedAt" IS NULL' })
export class WorkspaceInvite extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

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
