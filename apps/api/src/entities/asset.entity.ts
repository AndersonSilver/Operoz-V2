import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { User } from "./user.entity.js";

/**
 * Upload unificado (avatar, cover, anexo de issue, imagem embutida em
 * página) — armazenamento em disco local neste sandbox (sem S3/MinIO
 * configurado), servido por endpoint autenticado em vez de URL
 * pré-assinada. `storageKey` é o nome do arquivo em `.assets/` (não um
 * path absoluto, para não vazar estrutura de diretório do servidor).
 */
@Entity({ name: "assets" })
export class Asset extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "uploadedById" })
  uploadedBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  uploadedById!: string | null;

  @Column({ type: "text" })
  storageKey!: string;

  @Column({ type: "text" })
  fileName!: string;

  @Column({ type: "text" })
  mimeType!: string;

  @Column({ type: "int" })
  size!: number;
}
