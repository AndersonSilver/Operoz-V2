import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";
import { User } from "./user.entity.js";

export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none";

export const ISSUE_PRIORITY_ORDER: IssuePriority[] = ["urgent", "high", "medium", "low", "none"];

/**
 * Diferenças conscientes vs. o sistema original (documentadas, não bugs):
 * - `stateId` é `RESTRICT` (não `CASCADE`) — apagar um State com issues
 *   é bloqueado, nunca apaga issues em cascata.
 * - `parentId` é `SET NULL` (não `CASCADE`) — apagar uma issue-pai nunca
 *   apaga as sub-issues, só desvincula.
 * - `(projectId, sequenceId)` é único em TODAS as linhas, inclusive
 *   soft-deletadas (sem `WHERE deletedAt IS NULL`) — garante que o
 *   número "PROJ-123" nunca é reemitido, sem precisar de tabela de
 *   histórico separada.
 * - Sem `descriptionBinary` (CRDT de edição colaborativa) nem
 *   `isDraft`/rascunho nesta tabela — rascunhos são a entidade
 *   `DraftIssue`, totalmente separada.
 */
@Entity({ name: "issues" })
@Index(["projectId", "sequenceId"], { unique: true })
export class Issue extends BaseEntity {
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

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "jsonb", default: {} })
  descriptionJson!: Record<string, unknown>;

  @Column({ type: "text", default: "<p></p>" })
  descriptionHtml!: string;

  @Column({ type: "text", default: "none" })
  priority!: IssuePriority;

  @Column({ type: "uuid", nullable: true })
  stateId!: string | null;

  @Column({ type: "int", nullable: true })
  point!: number | null;

  @Column({ type: "uuid", nullable: true })
  estimatePointId!: string | null;

  @Column({ type: "date", nullable: true })
  startDate!: string | null;

  @Column({ type: "date", nullable: true })
  targetDate!: string | null;

  @Column({ type: "int" })
  sequenceId!: number;

  @Column({ type: "double precision", default: 65535 })
  sortOrder!: number;

  @Column({ type: "timestamptz", nullable: true })
  completedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  parentId!: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "createdById" })
  createdBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  createdById!: string | null;
}
