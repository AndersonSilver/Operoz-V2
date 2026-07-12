import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { User } from "./user.entity.js";

/**
 * Simplificação consciente vs. o original (que tem V1 multipart-direto e
 * V2 presigned-S3 coexistindo): modelamos só metadados aqui. A geração
 * real de presigned URL depende de um provider de storage configurado
 * (S3/MinIO) — fora do escopo desta reescrita até haver credenciais de
 * storage no ambiente; por ora o cliente fornece `assetUrl` já hospedado
 * externamente e o backend só guarda metadados + soft delete uniforme
 * (o original tinha V1 hard-delete e V2 soft-delete, inconsistente).
 */
@Entity({ name: "issue_attachments" })
export class IssueAttachment extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "uploadedById" })
  uploadedBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  uploadedById!: string | null;

  @Column({ type: "text" })
  assetUrl!: string;

  @Column({ type: "text" })
  fileName!: string;

  @Column({ type: "text", nullable: true })
  mimeType!: string | null;

  @Column({ type: "int", default: 0 })
  size!: number;
}
