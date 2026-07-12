import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Project } from "./project.entity.js";

export type StateGroup = "backlog" | "unstarted" | "started" | "completed" | "cancelled" | "triage";

@Entity({ name: "states" })
@Index(["projectId", "name"], { unique: true, where: '"deletedAt" IS NULL' })
export class State extends BaseEntity {
  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "text" })
  color!: string;

  @Column({ type: "text" })
  slug!: string;

  @Column({ type: "double precision", default: 65535 })
  sequence!: number;

  @Column({ type: "text", default: "backlog" })
  group!: StateGroup;

  @Column({ type: "boolean", default: false })
  isTriage!: boolean;

  @Column({ type: "boolean", default: false })
  isDefault!: boolean;
}
