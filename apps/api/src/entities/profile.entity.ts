import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { User } from "./user.entity.js";

/**
 * Dados de perfil/onboarding do usuário, separados de User para manter
 * a entidade de autenticação enxuta. Criado automaticamente no signup.
 */
@Entity({ name: "profiles" })
export class Profile extends BaseEntity {
  @OneToOne(() => User, (user) => user.profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({ type: "boolean", default: false })
  isOnboarded!: boolean;

  @Column({ type: "boolean", default: false })
  isTourCompleted!: boolean;

  @Column({ type: "int", default: 0 })
  onboardingStep!: number;

  @Column({ type: "uuid", nullable: true })
  lastWorkspaceId!: string | null;

  @Column({ type: "text", default: "system" })
  theme!: string;

  @Column({ type: "int", default: 1 })
  startOfWeek!: number;
}
