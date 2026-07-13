import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Team } from "./team.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "team_members" })
@Index(["teamId", "userId"], { unique: true })
export class TeamMember extends BaseEntity {
  @ManyToOne(() => Team, { onDelete: "CASCADE" })
  @JoinColumn({ name: "teamId" })
  team!: Team;

  @Column({ type: "uuid" })
  teamId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;
}
