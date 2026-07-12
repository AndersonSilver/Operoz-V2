import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";

/** Correção consciente vs. original: unicidade `(issue, url)` é constraint de banco, não só checagem de aplicação. */
@Entity({ name: "issue_links" })
@Index(["issueId", "url"], { unique: true, where: '"deletedAt" IS NULL' })
export class IssueLink extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @Column({ type: "text" })
  url!: string;

  @Column({ type: "text", nullable: true })
  title!: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;
}
