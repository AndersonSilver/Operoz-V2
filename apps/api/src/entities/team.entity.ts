import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "teams" })
@Index(["workspaceId", "name"], { unique: true, where: '"deletedAt" IS NULL' })
export class Team extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "createdById" })
  createdBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  createdById!: string | null;
}
