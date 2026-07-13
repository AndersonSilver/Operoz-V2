import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { CustomField } from "./custom-field.entity.js";

/**
 * `value` guarda a forma já normalizada para o `type` do campo no
 * momento da escrita: string (text/url/date ISO), number, boolean, id
 * de opção (select) ou array de ids (multi_select) — ver
 * `custom-field.service.ts#coerceValue`.
 */
@Entity({ name: "issue_custom_field_values" })
@Index(["issueId", "customFieldId"], { unique: true })
export class IssueCustomFieldValue extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @ManyToOne(() => CustomField, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customFieldId" })
  customField!: CustomField;

  @Column({ type: "uuid" })
  customFieldId!: string;

  @Column({ type: "jsonb" })
  value!: unknown;
}
