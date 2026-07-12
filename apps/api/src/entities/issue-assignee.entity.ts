import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "issue_assignees" })
@Index(["issueId", "assigneeId"], { unique: true, where: '"deletedAt" IS NULL' })
export class IssueAssignee extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "assigneeId" })
  assignee!: User;

  @Column({ type: "uuid" })
  assigneeId!: string;
}
