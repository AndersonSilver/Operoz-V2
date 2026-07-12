import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "workspace_themes" })
@Index(["workspaceId", "name"], { unique: true, where: '"deletedAt" IS NULL' })
export class WorkspaceTheme extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @Column({ type: "text" })
  name!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "actorId" })
  actor!: User | null;

  @Column({ type: "uuid", nullable: true })
  actorId!: string | null;

  @Column({ type: "jsonb", default: {} })
  colors!: Record<string, string>;
}
