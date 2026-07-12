import { MigrationInterface, QueryRunner } from "typeorm";

export class Projects1700000002000 implements MigrationInterface {
  name = "Projects1700000002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "name" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "descriptionText" jsonb,
        "workspaceId" uuid NOT NULL,
        "identifier" text NOT NULL,
        "network" smallint NOT NULL DEFAULT 2,
        "projectLeadId" uuid,
        "defaultAssigneeId" uuid,
        "emoji" text,
        "iconProp" jsonb,
        "logoProps" jsonb NOT NULL DEFAULT '{}',
        "coverImageUrl" text,
        "moduleView" boolean NOT NULL DEFAULT true,
        "cycleView" boolean NOT NULL DEFAULT true,
        "issueViewsView" boolean NOT NULL DEFAULT true,
        "pageView" boolean NOT NULL DEFAULT true,
        "intakeView" boolean NOT NULL DEFAULT true,
        "supportView" boolean NOT NULL DEFAULT true,
        "isTimeTrackingEnabled" boolean NOT NULL DEFAULT false,
        "guestViewAllFeatures" boolean NOT NULL DEFAULT false,
        "archiveIn" integer NOT NULL DEFAULT 0,
        "closeIn" integer NOT NULL DEFAULT 0,
        "timezone" text NOT NULL DEFAULT 'UTC',
        "archivedAt" timestamptz,
        CONSTRAINT "PK_projects" PRIMARY KEY ("id"),
        CONSTRAINT "FK_projects_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_projects_lead" FOREIGN KEY ("projectLeadId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_projects_default_assignee" FOREIGN KEY ("defaultAssigneeId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_projects_workspace_name" ON "projects" ("workspaceId", "name") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_projects_workspace_identifier" ON "projects" ("workspaceId", "identifier") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" smallint NOT NULL DEFAULT 5,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" double precision NOT NULL DEFAULT 65535,
        "viewProps" jsonb NOT NULL DEFAULT '{}',
        "preferences" jsonb NOT NULL DEFAULT '{"pages":{"blockDisplay":true},"navigation":{"defaultTab":"work_items","hideInMoreMenu":[]}}',
        CONSTRAINT "PK_project_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_members_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_members_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_members_project_user" ON "project_members" ("projectId", "userId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "project_invites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "email" citext NOT NULL,
        "token" text NOT NULL,
        "accepted" boolean NOT NULL DEFAULT false,
        "message" text,
        "respondedAt" timestamptz,
        "role" smallint NOT NULL DEFAULT 5,
        CONSTRAINT "PK_project_invites" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_invites_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_invites_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_project_invites_project_email" ON "project_invites" ("projectId", "email") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_project_invites_token" ON "project_invites" ("token")`);

    await queryRunner.query(`
      CREATE TABLE "favorites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "entityType" text NOT NULL,
        "entityId" uuid NOT NULL,
        CONSTRAINT "PK_favorites" PRIMARY KEY ("id"),
        CONSTRAINT "FK_favorites_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_favorites_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_favorites_workspace_user_entity" ON "favorites" ("workspaceId", "userId", "entityType", "entityId") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "favorites"`);
    await queryRunner.query(`DROP TABLE "project_invites"`);
    await queryRunner.query(`DROP TABLE "project_members"`);
    await queryRunner.query(`DROP TABLE "projects"`);
  }
}
