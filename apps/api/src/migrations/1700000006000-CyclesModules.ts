import { MigrationInterface, QueryRunner } from "typeorm";

export class CyclesModules1700000006000 implements MigrationInterface {
  name = "CyclesModules1700000006000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cycles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "startDate" timestamptz,
        "endDate" timestamptz,
        "ownedById" uuid NOT NULL,
        "sortOrder" double precision NOT NULL DEFAULT 65535,
        "progressSnapshot" jsonb NOT NULL DEFAULT '{}',
        "archivedAt" timestamptz,
        CONSTRAINT "PK_cycles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cycles_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cycles_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cycles_owner" FOREIGN KEY ("ownedById") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_cycles_project" ON "cycles" ("projectId")`);

    await queryRunner.query(`
      CREATE TABLE "cycle_issues" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "cycleId" uuid NOT NULL,
        "issueId" uuid NOT NULL,
        CONSTRAINT "PK_cycle_issues" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cycle_issues_cycle" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cycle_issues_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cycle_issues_issue" ON "cycle_issues" ("issueId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "modules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "startDate" date,
        "targetDate" date,
        "status" text NOT NULL DEFAULT 'planned',
        "leadId" uuid,
        "createdById" uuid,
        "sortOrder" double precision NOT NULL DEFAULT 65535,
        "archivedAt" timestamptz,
        CONSTRAINT "PK_modules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_modules_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_modules_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_modules_lead" FOREIGN KEY ("leadId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_modules_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_modules_project_name" ON "modules" ("projectId", "name") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "module_issues" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "moduleId" uuid NOT NULL,
        "issueId" uuid NOT NULL,
        CONSTRAINT "PK_module_issues" PRIMARY KEY ("id"),
        CONSTRAINT "FK_module_issues_module" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_module_issues_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_module_issues_module_issue" ON "module_issues" ("moduleId", "issueId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "module_links" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "moduleId" uuid NOT NULL,
        "url" text NOT NULL,
        "title" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_module_links" PRIMARY KEY ("id"),
        CONSTRAINT "FK_module_links_module" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "module_links"`);
    await queryRunner.query(`DROP TABLE "module_issues"`);
    await queryRunner.query(`DROP TABLE "modules"`);
    await queryRunner.query(`DROP TABLE "cycle_issues"`);
    await queryRunner.query(`DROP TABLE "cycles"`);
  }
}
