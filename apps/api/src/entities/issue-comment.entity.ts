import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { User } from "./user.entity.js";

/**
 * Simplificação consciente vs. o original: sem a entidade satélite
 * `Description` compartilhada (reuso entre Issue/Comment/Page) — o
 * rich-text vive direto na tabela, mais simples e suficiente aqui.
 */
@Entity({ name: "issue_comments" })
export class IssueComment extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "actorId" })
  actor!: User | null;

  @Column({ type: "uuid", nullable: true })
  actorId!: string | null;

  @Column({ type: "jsonb", default: {} })
  commentJson!: Record<string, unknown>;

  @Column({ type: "text", default: "<p></p>" })
  commentHtml!: string;

  @ManyToOne(() => IssueComment, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "parentId" })
  parent!: IssueComment | null;

  @Column({ type: "uuid", nullable: true })
  parentId!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  editedAt!: Date | null;
}
