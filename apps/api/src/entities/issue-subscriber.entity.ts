import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "issue_subscribers" })
@Index(["issueId", "subscriberId"], { unique: true, where: '"deletedAt" IS NULL' })
export class IssueSubscriber extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "subscriberId" })
  subscriber!: User;

  @Column({ type: "uuid" })
  subscriberId!: string;
}
