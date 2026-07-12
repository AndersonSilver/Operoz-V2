import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "workspace_user_properties" })
@Index(["workspaceId", "userId"], { unique: true, where: '"deletedAt" IS NULL' })
export class WorkspaceUserProperties extends BaseEntity {
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

  @Column({ type: "jsonb", default: {} })
  filters!: Record<string, unknown>;

  @Column({ type: "jsonb", default: {} })
  displayFilters!: Record<string, unknown>;

  @Column({ type: "jsonb", default: {} })
  displayProperties!: Record<string, unknown>;

  @Column({ type: "int", default: 10 })
  navigationProjectLimit!: number;

  @Column({ type: "text", default: "ACCORDION" })
  navigationControlPreference!: "ACCORDION" | "TABBED";
}
