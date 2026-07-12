import { MigrationInterface, QueryRunner } from "typeorm";

export class Issues1700000004000 implements MigrationInterface {
  name = "Issues1700000004000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "issues" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "name" text NOT NULL,
        "descriptionJson" jsonb NOT NULL DEFAULT '{}',
        "descriptionHtml" text NOT NULL DEFAULT '<p></p>',
        "priority" text NOT NULL DEFAULT 'none',
        "stateId" uuid,
        "point" integer,
        "estimatePointId" uuid,
        "startDate" date,
        "targetDate" date,
        "sequenceId" integer NOT NULL,
        "sortOrder" double precision NOT NULL DEFAULT 65535,
        "completedAt" timestamptz,
        "archivedAt" timestamptz,
        "parentId" uuid,
        "createdById" uuid,
        CONSTRAINT "PK_issues" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issues_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issues_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issues_state" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_issues_estimate_point" FOREIGN KEY ("estimatePointId") REFERENCES "estimate_points"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_issues_parent" FOREIGN KEY ("parentId") REFERENCES "issues"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_issues_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_issues_project_sequence" ON "issues" ("projectId", "sequenceId")`);
    await queryRunner.query(`CREATE INDEX "IDX_issues_project" ON "issues" ("projectId")`);
    await queryRunner.query(`CREATE INDEX "IDX_issues_state" ON "issues" ("stateId")`);
    await queryRunner.query(`CREATE INDEX "IDX_issues_parent" ON "issues" ("parentId")`);

    await queryRunner.query(`
      CREATE TABLE "issue_assignees" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "assigneeId" uuid NOT NULL,
        CONSTRAINT "PK_issue_assignees" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_assignees_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_assignees_user" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_issue_assignees_issue_assignee" ON "issue_assignees" ("issueId", "assigneeId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "issue_labels" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid NOT NULL,
        "labelId" uuid NOT NULL,
        CONSTRAINT "PK_issue_labels" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_labels_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_labels_label" FOREIGN KEY ("labelId") REFERENCES "labels"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_issue_labels_issue_label" ON "issue_labels" ("issueId", "labelId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "issue_activities" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "issueId" uuid,
        "projectId" uuid NOT NULL,
        "workspaceId" uuid NOT NULL,
        "actorId" uuid,
        "verb" text NOT NULL DEFAULT 'created',
        "field" text,
        "oldValue" text,
        "newValue" text,
        "oldIdentifier" uuid,
        "newIdentifier" uuid,
        CONSTRAINT "PK_issue_activities" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_activities_issue" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_issue_activities_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_activities_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_activities_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_issue_activities_issue" ON "issue_activities" ("issueId")`);

    await queryRunner.query(`
      CREATE TABLE "draft_issues" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "createdById" uuid NOT NULL,
        "name" text,
        "descriptionJson" jsonb NOT NULL DEFAULT '{}',
        "descriptionHtml" text NOT NULL DEFAULT '<p></p>',
        "priority" text NOT NULL DEFAULT 'none',
        "stateId" uuid,
        "estimatePointId" uuid,
        "startDate" date,
        "targetDate" date,
        "parentId" uuid,
        "assigneeIds" uuid[] NOT NULL DEFAULT '{}',
        "labelIds" uuid[] NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_draft_issues" PRIMARY KEY ("id"),
        CONSTRAINT "FK_draft_issues_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_draft_issues_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_draft_issues_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_draft_issues_state" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_draft_issues_estimate_point" FOREIGN KEY ("estimatePointId") REFERENCES "estimate_points"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_draft_issues_parent" FOREIGN KEY ("parentId") REFERENCES "issues"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_draft_issues_created_by" ON "draft_issues" ("createdById")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "draft_issues"`);
    await queryRunner.query(`DROP TABLE "issue_activities"`);
    await queryRunner.query(`DROP TABLE "issue_labels"`);
    await queryRunner.query(`DROP TABLE "issue_assignees"`);
    await queryRunner.query(`DROP TABLE "issues"`);
  }
}
