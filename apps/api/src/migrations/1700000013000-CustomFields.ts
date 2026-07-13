import { MigrationInterface, QueryRunner } from "typeorm";

export class CustomFields1700000013000 implements MigrationInterface {
  name = "CustomFields1700000013000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "custom_fields" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "projectId" uuid NOT NULL,
        "name" text NOT NULL,
        "type" text NOT NULL,
        "options" jsonb NOT NULL DEFAULT '[]',
        "required" boolean NOT NULL DEFAULT false,
        "sortOrder" double precision NOT NULL DEFAULT 65535,
        CONSTRAINT "PK_custom_fields" PRIMARY KEY ("id"),
        CONSTRAINT "FK_custom_fields_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_custom_fields_project_name" ON "custom_fields" ("projectId", "name") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "issue_custom_field_values" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "customFieldId" uuid NOT NULL,
        "value" jsonb NOT NULL,
        CONSTRAINT "PK_issue_custom_field_values" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_custom_field_values_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_custom_field_values_field" FOREIGN KEY ("customFieldId") REFERENCES "custom_fields"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_issue_custom_field_values_unique" ON "issue_custom_field_values" ("issueId", "customFieldId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "issue_custom_field_values"`);
    await queryRunner.query(`DROP TABLE "custom_fields"`);
  }
}
