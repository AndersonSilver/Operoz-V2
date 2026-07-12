import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "user_notification_preferences" })
@Index(["userId"], { unique: true, where: '"deletedAt" IS NULL' })
export class UserNotificationPreference extends BaseEntity {
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "boolean", default: true })
  propertyChange!: boolean;

  @Column({ type: "boolean", default: true })
  stateChange!: boolean;

  @Column({ type: "boolean", default: true })
  comment!: boolean;

  @Column({ type: "boolean", default: true })
  mention!: boolean;

  @Column({ type: "boolean", default: true })
  issueCompleted!: boolean;

  @Column({
    type: "jsonb",
    default: { email: { enabled: true, frequency: "immediate" }, in_app: { enabled: true } },
  })
  channels!: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  quietHoursStart!: string | null;

  @Column({ type: "text", nullable: true })
  quietHoursEnd!: string | null;

  @Column({ type: "text", default: "UTC" })
  quietHoursTimezone!: string;
}
