import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";
import { ProjectModule } from "./module.entity.js";
import { User } from "./user.entity.js";

/**
 * Simplificação consciente vs. o original: aqui só nível projeto/módulo
 * (sem relatório agregado no nível board — isso fica para quando "Board
 * Status Reports" for implementado como fase própria). `moduleId` nulo =
 * relatório de nível projeto; preenchido = relatório específico daquele
 * módulo. É o insumo principal (peso 60%) do Health Score do Client 360.
 */
@Entity({ name: "status_reports" })
export class StatusReport extends BaseEntity {
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

  @ManyToOne(() => ProjectModule, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "moduleId" })
  module!: ProjectModule | null;

  @Column({ type: "uuid", nullable: true })
  moduleId!: string | null;

  @Column({ type: "text", default: "" })
  title!: string;

  @Column({ type: "date" })
  periodStart!: string;

  @Column({ type: "date" })
  periodEnd!: string;

  @Column({ type: "jsonb", default: {} })
  content!: Record<string, unknown>;

  @Column({ type: "timestamptz", nullable: true })
  publishedAt!: Date | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "createdById" })
  createdBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  createdById!: string | null;
}
