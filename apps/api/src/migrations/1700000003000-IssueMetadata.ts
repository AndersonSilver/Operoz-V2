import { MigrationInterface, QueryRunner } from "typeorm";

export class IssueMetadata1700000003000 implements MigrationInterface {
  name = "IssueMetadata1700000003000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "states" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "projectId" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "color" text NOT NULL,
        "slug" text NOT NULL,
        "sequence" double precision NOT NULL DEFAULT 65535,
        "group" text NOT NULL DEFAULT 'backlog',
        "isTriage" boolean NOT NULL DEFAULT false,
        "isDefault" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_states" PRIMARY KEY ("id"),
        CONSTRAINT "FK_states_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_states_project_name" ON "states" ("projectId", "name") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "labels" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid,
        "name" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "color" text NOT NULL DEFAULT '',
        "sortOrder" double precision NOT NULL DEFAULT 65535,
        "parentId" uuid,
        CONSTRAINT "PK_labels" PRIMARY KEY ("id"),
        CONSTRAINT "FK_labels_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_labels_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_labels_parent" FOREIGN KEY ("parentId") REFERENCES "labels"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_labels_project_name" ON "labels" ("projectId", "name") WHERE "projectId" IS NOT NULL AND "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_labels_global_name" ON "labels" ("name") WHERE "projectId" IS NULL AND "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "estimates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "projectId" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "type" text NOT NULL,
        "lastUsed" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_estimates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_estimates_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_estimates_project_name" ON "estimates" ("projectId", "name") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "estimate_points" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "estimateId" uuid NOT NULL,
        "key" integer NOT NULL,
        "value" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        CONSTRAINT "PK_estimate_points" PRIMARY KEY ("id"),
        CONSTRAINT "FK_estimate_points_estimate" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_estimate_points_estimate_key" ON "estimate_points" ("estimateId", "key") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN "defaultStateId" uuid`);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN "estimateId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_default_state" FOREIGN KEY ("defaultStateId") REFERENCES "states"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_estimate" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_estimate"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_default_state"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "estimateId"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "defaultStateId"`);
    await queryRunner.query(`DROP TABLE "estimate_points"`);
    await queryRunner.query(`DROP TABLE "estimates"`);
    await queryRunner.query(`DROP TABLE "labels"`);
    await queryRunner.query(`DROP TABLE "states"`);
  }
}
