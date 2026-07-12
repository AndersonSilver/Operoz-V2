import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { User } from "./user.entity.js";

/** Sincronizada automaticamente a partir de `descriptionJson` a cada update de Issue (ver mention-parser.ts). */
@Entity({ name: "issue_mentions" })
@Index(["issueId", "mentionedUserId"], { unique: true, where: '"deletedAt" IS NULL' })
export class IssueMention extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "mentionedUserId" })
  mentionedUser!: User;

  @Column({ type: "uuid" })
  mentionedUserId!: string;
}
