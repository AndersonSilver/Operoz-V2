import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "issue_reactions" })
@Index(["issueId", "actorId", "reaction"], { unique: true, where: '"deletedAt" IS NULL' })
export class IssueReaction extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "actorId" })
  actor!: User;

  @Column({ type: "uuid" })
  actorId!: string;

  @Column({ type: "text" })
  reaction!: string;
}
