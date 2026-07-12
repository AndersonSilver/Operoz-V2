import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "workspaces" })
@Index(["slug"], { unique: true, where: '"deletedAt" IS NULL' })
export class Workspace extends BaseEntity {
  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  slug!: string;

  @Column({ type: "text", nullable: true })
  logoUrl!: string | null;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "ownerId" })
  owner!: User;

  @Column({ type: "uuid" })
  ownerId!: string;

  @Column({ type: "text", nullable: true })
  organizationSize!: string | null;

  @Column({ type: "text", default: "UTC" })
  timezone!: string;

  @Column({ type: "text" })
  backgroundColor!: string;

  @Column({ type: "boolean", default: false })
  notifyAssigneesAlwaysByEmail!: boolean;

  @Column({ type: "boolean", default: false })
  notifyEmailIncludeExtendedActivities!: boolean;

  @Column({ type: "boolean", default: false })
  notifyEmailIncludeDescriptionChanges!: boolean;

  @Column({ type: "boolean", default: false })
  notifyEmailDispatchImmediately!: boolean;
}
