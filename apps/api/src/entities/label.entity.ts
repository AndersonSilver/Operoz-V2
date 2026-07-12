import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";

@Entity({ name: "labels" })
@Index("IDX_labels_project_name", ["projectId", "name"], {
  unique: true,
  where: '"projectId" IS NOT NULL AND "deletedAt" IS NULL',
})
@Index("IDX_labels_global_name", ["name"], {
  unique: true,
  where: '"projectId" IS NULL AND "deletedAt" IS NULL',
})
export class Label extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "projectId" })
  project!: Project | null;

  @Column({ type: "uuid", nullable: true })
  projectId!: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "text", default: "" })
  color!: string;

  @Column({ type: "double precision", default: 65535 })
  sortOrder!: number;

  @ManyToOne(() => Label, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "parentId" })
  parent!: Label | null;

  @Column({ type: "uuid", nullable: true })
  parentId!: string | null;
}
