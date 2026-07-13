import { MigrationInterface, QueryRunner } from "typeorm";

export class Client360Core1700000016000 implements MigrationInterface {
  name = "Client360Core1700000016000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "status_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "moduleId" uuid,
        "title" text NOT NULL DEFAULT '',
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "content" jsonb NOT NULL DEFAULT '{}',
        "publishedAt" timestamptz,
        "createdById" uuid,
        CONSTRAINT "PK_status_reports" PRIMARY KEY ("id"),
        CONSTRAINT "FK_status_reports_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_status_reports_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_status_reports_module" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_status_reports_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_status_reports_project_period" ON "status_reports" ("projectId", "periodStart", "periodEnd")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_status_reports_module_period" ON "status_reports" ("moduleId", "periodStart", "periodEnd")`,
    );

    await queryRunner.query(`
      CREATE TABLE "board_client_360_health_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "boardId" uuid NOT NULL,
        "weightReport" smallint NOT NULL DEFAULT 60,
        "weightOverdue" smallint NOT NULL DEFAULT 25,
        "weightSupport" smallint NOT NULL DEFAULT 15,
        "thresholdOkMin" smallint NOT NULL DEFAULT 70,
        "thresholdWarningMin" smallint NOT NULL DEFAULT 45,
        "scoreAlertThreshold" smallint NOT NULL DEFAULT 40,
        "supportSlaDays" smallint NOT NULL DEFAULT 7,
        CONSTRAINT "PK_board_client_360_health_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_board_client_360_health_settings_board" UNIQUE ("boardId"),
        CONSTRAINT "FK_board_client_360_health_settings_board" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "client_360_health_snapshots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "healthScore" smallint NOT NULL,
        "health" text NOT NULL,
        CONSTRAINT "PK_client_360_health_snapshots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_client_360_health_snapshots_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_client_360_health_snapshots_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_client_360_health_snapshots_project_period" ON "client_360_health_snapshots" ("projectId", "periodStart")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_360_health_snapshots_workspace_period" ON "client_360_health_snapshots" ("workspaceId", "periodStart")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "client_360_health_snapshots"`);
    await queryRunner.query(`DROP TABLE "board_client_360_health_settings"`);
    await queryRunner.query(`DROP TABLE "status_reports"`);
  }
}
