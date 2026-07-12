import { Column, Entity, Index, OneToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Profile } from "./profile.entity.js";

@Entity({ name: "users" })
@Index(["email"], { unique: true, where: '"deletedAt" IS NULL' })
export class User extends BaseEntity {
  @Column({ type: "citext" })
  email!: string;

  @Column({ type: "text", nullable: true })
  passwordHash!: string | null;

  @Column({ type: "text", default: "" })
  firstName!: string;

  @Column({ type: "text", default: "" })
  lastName!: string;

  @Column({ type: "text", nullable: true })
  displayName!: string | null;

  @Column({ type: "text", nullable: true })
  avatarUrl!: string | null;

  @Column({ type: "boolean", default: false })
  isEmailVerified!: boolean;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: false })
  isBot!: boolean;

  @Column({ type: "text", default: "UTC" })
  timezone!: string;

  @Column({ type: "text", default: "pt-BR" })
  language!: string;

  @Column({ type: "timestamptz", nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: "text", nullable: true })
  lastLoginIp!: string | null;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile!: Profile;

  get fullName(): string {
    const name = `${this.firstName} ${this.lastName}`.trim();
    return name.length > 0 ? name : this.email;
  }
}
