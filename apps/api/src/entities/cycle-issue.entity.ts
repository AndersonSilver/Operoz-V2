import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Cycle } from "./cycle.entity.js";
import { Issue } from "./issue.entity.js";

/** Unicidade por `issueId` (não por par): uma issue só tem 1 vínculo ativo por vez — mover = atualizar `cycleId` da mesma linha. */
@Entity({ name: "cycle_issues" })
@Index(["issueId"], { unique: true, where: '"deletedAt" IS NULL' })
export class CycleIssue extends BaseEntity {
  @ManyToOne(() => Cycle, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cycleId" })
  cycle!: Cycle;

  @Column({ type: "uuid" })
  cycleId!: string;

  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;
}
