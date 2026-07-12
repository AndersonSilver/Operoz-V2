import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";

export type IssueRelationType =
  | "duplicate"
  | "relates_to"
  | "blocked_by"
  | "start_before"
  | "finish_before"
  | "implemented_by";

/**
 * Só o sentido canônico é persistido (uma linha por par); o rótulo
 * inverso ("blocking", "start_after" etc.) é calculado em tempo de
 * leitura pelo service — nunca gravamos as duas direções.
 */
@Entity({ name: "issue_relations" })
@Index(["issueId", "relatedIssueId"], { unique: true, where: '"deletedAt" IS NULL' })
export class IssueRelation extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "relatedIssueId" })
  relatedIssue!: Issue;

  @Column({ type: "uuid" })
  relatedIssueId!: string;

  @Column({ type: "text", default: "blocked_by" })
  relationType!: IssueRelationType;
}
