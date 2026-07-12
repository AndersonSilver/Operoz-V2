import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Project } from "./project.entity.js";
import { EstimatePoint } from "./estimate-point.entity.js";

export type EstimateType = "points" | "categories";

@Entity({ name: "estimates" })
@Index(["projectId", "name"], { unique: true, where: '"deletedAt" IS NULL' })
export class Estimate extends BaseEntity {
  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "text" })
  type!: EstimateType;

  @Column({ type: "boolean", default: false })
  lastUsed!: boolean;

  @OneToMany(() => EstimatePoint, (point) => point.estimate)
  points!: EstimatePoint[];
}
