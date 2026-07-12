import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";
import { User } from "./user.entity.js";

export enum PageAccess {
  PUBLIC = 0,
  PRIVATE = 1,
}

/**
 * Simplificações conscientes vs. o original: sem `descriptionBinary`
 * (CRDT de colaboração em tempo real — exige um serviço dedicado tipo
 * Hocuspocus/Yjs, fora do escopo deste backend REST), sem M2M
 * multi-projeto (`isGlobal`/`ProjectPage`) — cada página pertence a
 * exatamente um projeto, como o resto do domínio —, e sem
 * `movedToPage`/`movedToProject` (campos que existiam no original mas
 * nunca tiveram lógica implementada — não recriamos um stub vazio).
 */
@Entity({ name: "pages" })
export class Page extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "text", default: "" })
  name!: string;

  @Column({ type: "jsonb", default: {} })
  descriptionJson!: Record<string, unknown>;

  @Column({ type: "text", default: "<p></p>" })
  descriptionHtml!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "ownedById" })
  ownedBy!: User;

  @Column({ type: "uuid" })
  ownedById!: string;

  @Column({ type: "smallint", default: PageAccess.PUBLIC })
  access!: PageAccess;

  @Column({ type: "text", nullable: true })
  color!: string | null;

  @ManyToOne(() => Page, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "parentId" })
  parent!: Page | null;

  @Column({ type: "uuid", nullable: true })
  parentId!: string | null;

  @Column({ type: "boolean", default: false })
  isLocked!: boolean;

  @Column({ type: "jsonb", default: { full_width: false } })
  viewProps!: Record<string, unknown>;

  @Column({ type: "jsonb", default: {} })
  logoProps!: Record<string, unknown>;

  @Column({ type: "double precision", default: 65535 })
  sortOrder!: number;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt!: Date | null;
}
