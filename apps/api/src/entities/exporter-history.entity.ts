import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

export type ExportProvider = "csv" | "json";
export type ExportStatus = "queued" | "processing" | "completed" | "failed";

/**
 * Simplificação consciente vs. original: sem S3/MinIO configurado neste
 * ambiente, o arquivo gerado fica em disco local (`key` = caminho
 * relativo) servido por um endpoint de download autenticado, em vez de
 * URL pré-assinada de storage externo — mesmo padrão de deferimento já
 * aplicado a anexos de issue. Sem provider XLSX (exigiria nova
 * dependência); só CSV e JSON.
 */
@Entity({ name: "exporter_histories" })
export class ExporterHistory extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @Column({ type: "text", nullable: true })
  name!: string | null;

  @Column({ type: "uuid", array: true, default: () => "'{}'" })
  projectIds!: string[];

  @Column({ type: "text" })
  provider!: ExportProvider;

  @Column({ type: "text", default: "queued" })
  status!: ExportStatus;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @Column({ type: "text", nullable: true })
  key!: string | null;

  @Column({ type: "text" })
  token!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "initiatedById" })
  initiatedBy!: User;

  @Column({ type: "uuid" })
  initiatedById!: string;
}
