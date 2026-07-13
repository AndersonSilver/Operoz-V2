import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

export const RECENT_VISIT_ENTITY_TYPES = ["issue", "page", "project", "cycle", "module", "view"] as const;
export type RecentVisitEntityType = (typeof RECENT_VISIT_ENTITY_TYPES)[number];

/**
 * LRU manual por usuário+workspace (máx. 20 linhas, aplicado em
 * `recent-visit.service.ts` após cada upsert) — mesma abordagem do
 * original, sem depender de um mecanismo de expiração do banco.
 */
@Entity({ name: "user_recent_visits" })
@Index(["workspaceId", "userId", "entityType", "entityId"], { unique: true })
export class UserRecentVisit extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  entityType!: RecentVisitEntityType;

  @Column({ type: "uuid" })
  entityId!: string;

  @Column({ type: "timestamptz" })
  visitedAt!: Date;
}
