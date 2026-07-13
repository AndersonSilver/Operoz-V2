import { MigrationInterface, QueryRunner } from "typeorm";

export class IssueVersioning1700000012000 implements MigrationInterface {
  name = "IssueVersioning1700000012000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "issue_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "snapshot" jsonb NOT NULL,
        "savedById" uuid,
        CONSTRAINT "PK_issue_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_versions_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_versions_saved_by" FOREIGN KEY ("savedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_issue_versions_issue" ON "issue_versions" ("issueId", "createdAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE "issue_description_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "descriptionJson" jsonb NOT NULL DEFAULT '{}',
        "descriptionHtml" text NOT NULL DEFAULT '<p></p>',
        "savedById" uuid,
        CONSTRAINT "PK_issue_description_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_description_versions_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_description_versions_saved_by" FOREIGN KEY ("savedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_issue_description_versions_issue" ON "issue_description_versions" ("issueId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "issue_description_versions"`);
    await queryRunner.query(`DROP TABLE "issue_versions"`);
  }
}
