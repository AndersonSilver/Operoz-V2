import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";

export const CLIENT_360_HEALTH_VALUES = ["ok", "warning", "critical"] as const;
export type Client360Health = (typeof CLIENT_360_HEALTH_VALUES)[number];

/** Snapshot semanal (histórico) do health score de um projeto — único por (projeto, periodStart). */
@Entity({ name: "client_360_health_snapshots" })
@Index(["projectId", "periodStart"], { unique: true })
@Index(["workspaceId", "periodStart"])
export class Client360HealthSnapshot extends BaseEntity {
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

  @Column({ type: "date" })
  periodStart!: string;

  @Column({ type: "date" })
  periodEnd!: string;

  @Column({ type: "smallint" })
  healthScore!: number;

  @Column({ type: "text" })
  health!: Client360Health;
}
