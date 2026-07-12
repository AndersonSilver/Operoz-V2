import { MigrationInterface, QueryRunner } from "typeorm";

export class WebhooksApiTokens1700000009000 implements MigrationInterface {
  name = "WebhooksApiTokens1700000009000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "api_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "userId" uuid NOT NULL,
        "label" text NOT NULL,
        "description" text,
        "tokenHash" text NOT NULL,
        "tokenPrefix" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "isService" boolean NOT NULL DEFAULT false,
        "lastUsedAt" timestamptz,
        "expiresAt" timestamptz,
        CONSTRAINT "PK_api_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_api_tokens_hash" ON "api_tokens" ("tokenHash")`);
    await queryRunner.query(`CREATE INDEX "IDX_api_tokens_user" ON "api_tokens" ("userId")`);

    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "createdById" uuid,
        "url" text NOT NULL,
        "secretEncrypted" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "eventProject" boolean NOT NULL DEFAULT true,
        "eventIssue" boolean NOT NULL DEFAULT true,
        "eventModule" boolean NOT NULL DEFAULT true,
        "eventCycle" boolean NOT NULL DEFAULT true,
        "eventIssueComment" boolean NOT NULL DEFAULT true,
        "consecutiveFailures" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_webhooks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_webhooks_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_webhooks_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_webhooks_workspace_url" ON "webhooks" ("workspaceId", "url") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "webhook_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "webhookId" uuid NOT NULL,
        "eventType" text NOT NULL,
        "requestBody" text,
        "responseStatus" integer,
        "responseBody" text,
        "retryCount" integer NOT NULL DEFAULT 0,
        "success" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_webhook_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_webhook_logs_webhook" ON "webhook_logs" ("webhookId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "webhook_logs"`);
    await queryRunner.query(`DROP TABLE "webhooks"`);
    await queryRunner.query(`DROP TABLE "api_tokens"`);
  }
}
