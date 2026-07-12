import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { Project } from "./project.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

/**
 * Log genérico de auditoria: uma linha por campo alterado em cada
 * mutação de Issue. `issueId` é `SET NULL` (não CASCADE) — o histórico
 * sobrevive mesmo que a issue seja removida definitivamente no futuro.
 */
@Entity({ name: "issue_activities" })
export class IssueActivity extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "issueId" })
  issue!: Issue | null;

  @Column({ type: "uuid", nullable: true })
  issueId!: string | null;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column({ type: "uuid" })
  projectId!: string;

  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "actorId" })
  actor!: User | null;

  @Column({ type: "uuid", nullable: true })
  actorId!: string | null;

  @Column({ type: "text", default: "created" })
  verb!: string;

  @Column({ type: "text", nullable: true })
  field!: string | null;

  @Column({ type: "text", nullable: true })
  oldValue!: string | null;

  @Column({ type: "text", nullable: true })
  newValue!: string | null;

  @Column({ type: "uuid", nullable: true })
  oldIdentifier!: string | null;

  @Column({ type: "uuid", nullable: true })
  newIdentifier!: string | null;
}
