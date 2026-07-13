import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Board } from "./board.entity.js";
import { Project } from "./project.entity.js";

/** M:N — um projeto pode compor mais de um board (ex.: portfólio + squad). */
@Entity({ name: "board_projects" })
@Index(["boardId", "projectId"], { unique: true })
export class BoardProject extends BaseEntity {
  @ManyToOne(() => Board, { onDelete: "CASCADE" })
  @JoinColumn({ name: "boardId" })
  board!: Board;

  @Column({ type: "uuid" })
  boardId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column({ type: "uuid" })
  projectId!: string;
}
