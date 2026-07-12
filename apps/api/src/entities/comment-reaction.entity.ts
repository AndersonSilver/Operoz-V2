import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { IssueComment } from "./issue-comment.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "comment_reactions" })
@Index(["commentId", "actorId", "reaction"], { unique: true, where: '"deletedAt" IS NULL' })
export class CommentReaction extends BaseEntity {
  @ManyToOne(() => IssueComment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "commentId" })
  comment!: IssueComment;

  @Column({ type: "uuid" })
  commentId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "actorId" })
  actor!: User;

  @Column({ type: "uuid" })
  actorId!: string;

  @Column({ type: "text" })
  reaction!: string;
}
