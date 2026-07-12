import { MigrationInterface, QueryRunner } from "typeorm";

export class AnalyticsExports1700000010000 implements MigrationInterface {
  name = "AnalyticsExports1700000010000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "analytic_views" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "query" jsonb NOT NULL,
        CONSTRAINT "PK_analytic_views" PRIMARY KEY ("id"),
        CONSTRAINT "FK_analytic_views_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "exporter_histories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "name" text,
        "projectIds" uuid[] NOT NULL DEFAULT '{}',
        "provider" text NOT NULL,
        "status" text NOT NULL DEFAULT 'queued',
        "reason" text,
        "key" text,
        "token" text NOT NULL,
        "initiatedById" uuid NOT NULL,
        CONSTRAINT "PK_exporter_histories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_exporter_histories_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_exporter_histories_user" FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_exporter_histories_token" ON "exporter_histories" ("token")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exporter_histories"`);
    await queryRunner.query(`DROP TABLE "analytic_views"`);
  }
}
