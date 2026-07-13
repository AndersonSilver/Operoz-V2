import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Board } from "./board.entity.js";

/** 1:1 por board — pesos devem somar 100 (validado no schema/serviço). */
@Entity({ name: "board_client_360_health_settings" })
export class BoardClient360HealthSettings extends BaseEntity {
  @ManyToOne(() => Board, { onDelete: "CASCADE" })
  @JoinColumn({ name: "boardId" })
  board!: Board;

  @Column({ type: "uuid", unique: true })
  boardId!: string;

  @Column({ type: "smallint", default: 60 })
  weightReport!: number;

  @Column({ type: "smallint", default: 25 })
  weightOverdue!: number;

  @Column({ type: "smallint", default: 15 })
  weightSupport!: number;

  @Column({ type: "smallint", default: 70 })
  thresholdOkMin!: number;

  @Column({ type: "smallint", default: 45 })
  thresholdWarningMin!: number;

  @Column({ type: "smallint", default: 40 })
  scoreAlertThreshold!: number;

  @Column({ type: "smallint", default: 7 })
  supportSlaDays!: number;
}
