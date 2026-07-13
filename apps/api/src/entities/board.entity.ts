import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

/**
 * Núcleo do domínio Board: agrupamento de projetos dentro do workspace
 * (ex.: "cliente"/squad), com membros e RBAC próprios. Correção
 * consciente vs. o original: RBAC de board reaproveita o mesmo enum
 * `WorkspaceRole` (GUEST/MEMBER/ADMIN) em vez do catálogo de permissões
 * customizável (`BoardRole`/`BoardRolePermission`) — granularidade
 * configurável fica fora de escopo por ora (ver `BoardMember`).
 */
@Entity({ name: "boards" })
export class Board extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "createdById" })
  createdBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  createdById!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt!: Date | null;
}
