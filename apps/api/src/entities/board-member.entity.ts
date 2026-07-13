import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Board } from "./board.entity.js";
import { User } from "./user.entity.js";
import { WorkspaceRole } from "../common/roles.js";

@Entity({ name: "board_members" })
@Index(["boardId", "userId"], { unique: true, where: '"deletedAt" IS NULL' })
export class BoardMember extends BaseEntity {
  @ManyToOne(() => Board, { onDelete: "CASCADE" })
  @JoinColumn({ name: "boardId" })
  board!: Board;

  @Column({ type: "uuid" })
  boardId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "smallint", default: WorkspaceRole.MEMBER })
  role!: WorkspaceRole;
}
