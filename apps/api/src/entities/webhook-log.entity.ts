import { Column, Entity } from "typeorm";
import { BaseEntity } from "./base.entity.js";

/**
 * `webhookId` é proposital uma coluna solta, sem FK — o log sobrevive
 * mesmo que o webhook seja removido depois (auditoria histórica).
 * Correção consciente vs. original: `responseStatus` é inteiro, não
 * texto livre.
 */
@Entity({ name: "webhook_logs" })
export class WebhookLog extends BaseEntity {
  @Column({ type: "uuid" })
  workspaceId!: string;

  @Column({ type: "uuid" })
  webhookId!: string;

  @Column({ type: "text" })
  eventType!: string;

  @Column({ type: "text", nullable: true })
  requestBody!: string | null;

  @Column({ type: "int", nullable: true })
  responseStatus!: number | null;

  @Column({ type: "text", nullable: true })
  responseBody!: string | null;

  @Column({ type: "int", default: 0 })
  retryCount!: number;

  @Column({ type: "boolean", default: false })
  success!: boolean;
}
