import { MigrationInterface, QueryRunner } from "typeorm";

export class IssueRelations1700000005000 implements MigrationInterface {
  name = "IssueRelations1700000005000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "issue_comments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "actorId" uuid,
        "commentJson" jsonb NOT NULL DEFAULT '{}',
        "commentHtml" text NOT NULL DEFAULT '<p></p>',
        "parentId" uuid,
        "editedAt" timestamptz,
        CONSTRAINT "PK_issue_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_comments_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_comments_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_issue_comments_parent" FOREIGN KEY ("parentId") REFERENCES "issue_comments"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_issue_comments_issue" ON "issue_comments" ("issueId")`);

    await queryRunner.query(`
      CREATE TABLE "issue_attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "uploadedById" uuid,
        "assetUrl" text NOT NULL,
        "fileName" text NOT NULL,
        "mimeType" text,
        "size" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_issue_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_attachments_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_attachments_user" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_issue_attachments_issue" ON "issue_attachments" ("issueId")`);

    await queryRunner.query(`
      CREATE TABLE "issue_links" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "url" text NOT NULL,
        "title" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_issue_links" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_links_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_issue_links_issue_url" ON "issue_links" ("issueId", "url") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "issue_reactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "actorId" uuid NOT NULL,
        "reaction" text NOT NULL,
        CONSTRAINT "PK_issue_reactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_reactions_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_reactions_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_issue_reactions_issue_actor_reaction" ON "issue_reactions" ("issueId", "actorId", "reaction") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "comment_reactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "commentId" uuid NOT NULL,
        "actorId" uuid NOT NULL,
        "reaction" text NOT NULL,
        CONSTRAINT "PK_comment_reactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comment_reactions_comment" FOREIGN KEY ("commentId") REFERENCES "issue_comments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_comment_reactions_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_comment_reactions_comment_actor_reaction" ON "comment_reactions" ("commentId", "actorId", "reaction") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "issue_mentions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "mentionedUserId" uuid NOT NULL,
        CONSTRAINT "PK_issue_mentions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_mentions_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_mentions_user" FOREIGN KEY ("mentionedUserId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_issue_mentions_issue_user" ON "issue_mentions" ("issueId", "mentionedUserId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "issue_subscribers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "subscriberId" uuid NOT NULL,
        CONSTRAINT "PK_issue_subscribers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_subscribers_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_subscribers_user" FOREIGN KEY ("subscriberId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_issue_subscribers_issue_user" ON "issue_subscribers" ("issueId", "subscriberId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "issue_relations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "relatedIssueId" uuid NOT NULL,
        "relationType" text NOT NULL DEFAULT 'blocked_by',
        CONSTRAINT "PK_issue_relations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_relations_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_relations_related" FOREIGN KEY ("relatedIssueId") REFERENCES "issues"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_issue_relations_issue_related" ON "issue_relations" ("issueId", "relatedIssueId") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "issue_relations"`);
    await queryRunner.query(`DROP TABLE "issue_subscribers"`);
    await queryRunner.query(`DROP TABLE "issue_mentions"`);
    await queryRunner.query(`DROP TABLE "comment_reactions"`);
    await queryRunner.query(`DROP TABLE "issue_reactions"`);
    await queryRunner.query(`DROP TABLE "issue_links"`);
    await queryRunner.query(`DROP TABLE "issue_attachments"`);
    await queryRunner.query(`DROP TABLE "issue_comments"`);
  }
}
