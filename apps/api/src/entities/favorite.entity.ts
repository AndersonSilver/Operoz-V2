import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

/**
 * Favorito genérico: (workspace, user, tipo de entidade, id da entidade).
 * Reaproveitado por qualquer domínio que precise de "favoritar" algo
 * (projeto, view, página, ...) sem criar uma tabela por domínio.
 */
@Entity({ name: "favorites" })
@Index(["workspaceId", "userId", "entityType", "entityId"], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Favorite extends BaseEntity {
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
  entityType!: string;

  @Column({ type: "uuid" })
  entityId!: string;
}
