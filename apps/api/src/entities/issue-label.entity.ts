import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { Label } from "./label.entity.js";

@Entity({ name: "issue_labels" })
@Index(["issueId", "labelId"], { unique: true, where: '"deletedAt" IS NULL' })
export class IssueLabel extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @ManyToOne(() => Label, { onDelete: "CASCADE" })
  @JoinColumn({ name: "labelId" })
  label!: Label;

  @Column({ type: "uuid" })
  labelId!: string;
}
