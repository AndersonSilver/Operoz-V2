import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity.js";
import { Workspace } from "./workspace.entity.js";
import { Project } from "./project.entity.js";
import { User } from "./user.entity.js";

/**
 * Motor unificado (engine A + B do original consolidadas, seguindo a
 * própria recomendação da pesquisa): só notificações in-app nascidas de
 * IssueActivity/menções nesta fase. Regras de alerta configuráveis
 * (AlertRule), digest de e-mail agregado e integrações externas
 * (Discord/Google Calendar) ficam fora de escopo — exigiriam
 * infraestrutura de fila/cron que este backend ainda não tem além do
 * script standalone de arquivamento.
 *
 * `projectId` é `SET NULL` (não CASCADE como no original) — apagar um
 * projeto não deveria apagar o histórico de notificações do usuário.
 */
@Entity({ name: "notifications" })
@Index(["receiverId", "workspaceId", "readAt"])
@Index(["receiverId", "workspaceId", "archivedAt", "snoozedTill"])
export class Notification extends BaseEntity {
  @ManyToOne(() => Workspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspaceId" })
  workspace!: Workspace;

  @Column({ type: "uuid" })
  workspaceId!: string;

  @ManyToOne(() => Project, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "projectId" })
  project!: Project | null;

  @Column({ type: "uuid", nullable: true })
  projectId!: string | null;

  @Column({ type: "text" })
  entityType!: string;

  @Column({ type: "uuid", nullable: true })
  entityIdentifier!: string | null;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text", default: "<p></p>" })
  messageHtml!: string;

  @Column({ type: "jsonb", default: {} })
  data!: Record<string, unknown>;

  @Column({ type: "text" })
  sender!: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "triggeredById" })
  triggeredBy!: User | null;

  @Column({ type: "uuid", nullable: true })
  triggeredById!: string | null;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "receiverId" })
  receiver!: User;

  @Column({ type: "uuid" })
  receiverId!: string;

  @Column({ type: "timestamptz", nullable: true })
  readAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  snoozedTill!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt!: Date | null;
}
