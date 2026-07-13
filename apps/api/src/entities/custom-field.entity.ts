import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Project } from "./project.entity.js";

export const CUSTOM_FIELD_TYPES = ["text", "number", "date", "checkbox", "select", "multi_select", "url"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface CustomFieldOption {
  id: string;
  name: string;
  color?: string;
}

/**
 * Catálogo por projeto (mais simples que o par
 * WorkspaceCustomField/ProjectCustomField do original — aqui não há
 * reuso entre projetos, escopo direto). O tipo é imutável após criação
 * (ver `custom-field.service.ts`): mudar o tipo invalidaria retroativamente
 * os valores já gravados em `IssueCustomFieldValue`.
 */
@Entity({ name: "custom_fields" })
@Index(["projectId", "name"], { unique: true, where: '"deletedAt" IS NULL' })
export class CustomField extends BaseEntity {
  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "projectId" })
  project!: Project;

  @Column({ type: "uuid" })
  projectId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  type!: CustomFieldType;

  @Column({ type: "jsonb", default: [] })
  options!: CustomFieldOption[];

  @Column({ type: "boolean", default: false })
  required!: boolean;

  @Column({ type: "double precision", default: 65535 })
  sortOrder!: number;
}
