import { MigrationInterface, QueryRunner } from "typeorm";

export class PagesViews1700000007000 implements MigrationInterface {
  name = "PagesViews1700000007000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "name" text NOT NULL DEFAULT '',
        "descriptionJson" jsonb NOT NULL DEFAULT '{}',
        "descriptionHtml" text NOT NULL DEFAULT '<p></p>',
        "ownedById" uuid NOT NULL,
        "access" smallint NOT NULL DEFAULT 0,
        "color" text,
        "parentId" uuid,
        "isLocked" boolean NOT NULL DEFAULT false,
        "viewProps" jsonb NOT NULL DEFAULT '{"full_width":false}',
        "logoProps" jsonb NOT NULL DEFAULT '{}',
        "sortOrder" double precision NOT NULL DEFAULT 65535,
        "archivedAt" timestamptz,
        CONSTRAINT "PK_pages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pages_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pages_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pages_owner" FOREIGN KEY ("ownedById") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_pages_parent" FOREIGN KEY ("parentId") REFERENCES "pages"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_pages_project" ON "pages" ("projectId")`);
    await queryRunner.query(`CREATE INDEX "IDX_pages_parent" ON "pages" ("parentId")`);

    await queryRunner.query(`
      CREATE TABLE "page_labels" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "pageId" uuid NOT NULL,
        "labelId" uuid NOT NULL,
        CONSTRAINT "PK_page_labels" PRIMARY KEY ("id"),
        CONSTRAINT "FK_page_labels_page" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_page_labels_label" FOREIGN KEY ("labelId") REFERENCES "labels"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_page_labels_page_label" ON "page_labels" ("pageId", "labelId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "page_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "pageId" uuid NOT NULL,
        "descriptionJson" jsonb NOT NULL DEFAULT '{}',
        "descriptionHtml" text NOT NULL DEFAULT '<p></p>',
        "savedById" uuid,
        CONSTRAINT "PK_page_versions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_page_versions_page" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_page_versions_user" FOREIGN KEY ("savedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_page_versions_page" ON "page_versions" ("pageId")`);

    await queryRunner.query(`
      CREATE TABLE "issue_views" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid,
        "name" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "filters" jsonb NOT NULL DEFAULT '{}',
        "query" jsonb NOT NULL DEFAULT '{}',
        "displayFilters" jsonb NOT NULL DEFAULT '{}',
        "displayProperties" jsonb NOT NULL DEFAULT '{}',
        "access" smallint NOT NULL DEFAULT 1,
        "sortOrder" double precision NOT NULL DEFAULT 65535,
        "logoProps" jsonb NOT NULL DEFAULT '{}',
        "ownedById" uuid NOT NULL,
        "isLocked" boolean NOT NULL DEFAULT false,
        "archivedAt" timestamptz,
        CONSTRAINT "PK_issue_views" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_views_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_views_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_views_owner" FOREIGN KEY ("ownedById") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_issue_views_project" ON "issue_views" ("projectId")`);
    await queryRunner.query(`CREATE INDEX "IDX_issue_views_workspace" ON "issue_views" ("workspaceId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "issue_views"`);
    await queryRunner.query(`DROP TABLE "page_versions"`);
    await queryRunner.query(`DROP TABLE "page_labels"`);
    await queryRunner.query(`DROP TABLE "pages"`);
  }
}
