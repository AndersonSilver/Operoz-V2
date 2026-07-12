import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Estimate } from "./estimate.entity.js";

/**
 * Diferente do sistema original: ordenamos por `key` (inteiro), não por
 * `value` como string — lá, "13" ordenava antes de "2" (ordenação
 * lexicográfica). Também adicionamos unicidade de `(estimate, key)`,
 * ausente no original (era um TODO conhecido lá).
 */
@Entity({ name: "estimate_points" })
@Index(["estimateId", "key"], { unique: true, where: '"deletedAt" IS NULL' })
export class EstimatePoint extends BaseEntity {
  @ManyToOne(() => Estimate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "estimateId" })
  estimate!: Estimate;

  @Column({ type: "uuid" })
  estimateId!: string;

  @Column({ type: "int" })
  key!: number;

  @Column({ type: "text" })
  value!: string;

  @Column({ type: "text", default: "" })
  description!: string;
}
