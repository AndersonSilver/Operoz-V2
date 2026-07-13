import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

/** Nota pessoal, sempre privada ao autor — nunca visível a outros membros do workspace. */
@Entity({ name: "stickies" })
export class Sticky extends BaseEntity {
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

  @Column({ type: "text", nullable: true })
  title!: string | null;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "text", nullable: true })
  color!: string | null;
}
