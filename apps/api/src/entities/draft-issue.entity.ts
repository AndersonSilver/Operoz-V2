import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";
import { User } from "./user.entity.js";
import type { IssuePriority } from "./issue.entity.js";

/**
 * Rascunho privado: só o criador o enxerga. Sem `sequenceId` (só ganha
 * numeração ao ser publicado como Issue real). `assigneeIds`/`labelIds`
 * como arrays simples (não tabelas de junção com soft-delete próprio,
 * como em Issue) — simplificação consciente, já que um rascunho não é
 * compartilhado nem precisa de histórico de associação.
 */
@Entity({ name: "draft_issues" })
export class DraftIssue extends BaseEntity {
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

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "createdById" })
  createdBy!: User;

  @Column({ type: "uuid" })
  createdById!: string;

  @Column({ type: "text", nullable: true })
  name!: string | null;

  @Column({ type: "jsonb", default: {} })
  descriptionJson!: Record<string, unknown>;

  @Column({ type: "text", default: "<p></p>" })
  descriptionHtml!: string;

  @Column({ type: "text", default: "none" })
  priority!: IssuePriority;

  @Column({ type: "uuid", nullable: true })
  stateId!: string | null;

  @Column({ type: "uuid", nullable: true })
  estimatePointId!: string | null;

  @Column({ type: "date", nullable: true })
  startDate!: string | null;

  @Column({ type: "date", nullable: true })
  targetDate!: string | null;

  @Column({ type: "uuid", nullable: true })
  parentId!: string | null;

  @Column({ type: "uuid", array: true, default: () => "'{}'" })
  assigneeIds!: string[];

  @Column({ type: "uuid", array: true, default: () => "'{}'" })
  labelIds!: string[];
}
