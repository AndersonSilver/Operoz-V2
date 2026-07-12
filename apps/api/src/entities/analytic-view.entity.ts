import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";

/** Dashboard salvo: guarda só os PARÂMETROS do filtro (não um snapshot de resultado) — reexecutado a cada leitura. */
@Entity({ name: "analytic_views" })
export class AnalyticView extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "jsonb" })
  query!: Record<string, unknown>;
}
