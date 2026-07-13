import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { User } from "./user.entity.js";

/** Espelha `PageVersion`: debounce de 10min, mantém as 20 mais recentes, com restore. */
@Entity({ name: "issue_description_versions" })
export class IssueDescriptionVersion extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @Column({ type: "jsonb", default: {} })
  descriptionJson!: Record<string, unknown>;

  @Column({ type: "text", default: "<p></p>" })
  descriptionHtml!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "savedById" })
  savedBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  savedById!: string | null;
}
