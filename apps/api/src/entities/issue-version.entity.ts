import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Issue } from "./issue.entity.js";
import { User } from "./user.entity.js";

/**
 * Snapshot completo (não só descrição) do estado da issue a cada
 * atualização substantiva — trilha de auditoria somente-leitura,
 * separada de `IssueActivity` (que registra diffs campo a campo, não o
 * estado inteiro). Sem endpoint de restore: reverter priority/state
 * teria efeitos colaterais (notificações, webhooks, subscribers) que
 * um snapshot puro não deveria disparar sozinho.
 */
@Entity({ name: "issue_versions" })
export class IssueVersion extends BaseEntity {
  @ManyToOne(() => Issue, { onDelete: "CASCADE" })
  @JoinColumn({ name: "issueId" })
  issue!: Issue;

  @Column({ type: "uuid" })
  issueId!: string;

  @Column({ type: "jsonb" })
  snapshot!: Record<string, unknown>;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "savedById" })
  savedBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  savedById!: string | null;
}
