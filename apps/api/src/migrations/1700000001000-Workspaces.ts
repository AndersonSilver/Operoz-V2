import { MigrationInterface, QueryRunner } from "typeorm";

export class Workspaces1700000001000 implements MigrationInterface {
  name = "Workspaces1700000001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workspaces" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "name" text NOT NULL,
        "slug" text NOT NULL,
        "logoUrl" text,
        "ownerId" uuid NOT NULL,
        "organizationSize" text,
        "timezone" text NOT NULL DEFAULT 'UTC',
        "backgroundColor" text NOT NULL,
        "notifyAssigneesAlwaysByEmail" boolean NOT NULL DEFAULT false,
        "notifyEmailIncludeExtendedActivities" boolean NOT NULL DEFAULT false,
        "notifyEmailIncludeDescriptionChanges" boolean NOT NULL DEFAULT false,
        "notifyEmailDispatchImmediately" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_workspaces" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspaces_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_workspaces_slug" ON "workspaces" ("slug") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "workspace_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" smallint NOT NULL DEFAULT 5,
        "companyRole" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "viewProps" jsonb NOT NULL DEFAULT '{}',
        "issueProps" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_workspace_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspace_members_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_workspace_members_workspace_user" ON "workspace_members" ("workspaceId", "userId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "workspace_invites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "email" citext NOT NULL,
        "token" text NOT NULL,
        "accepted" boolean NOT NULL DEFAULT false,
        "message" text,
        "respondedAt" timestamptz,
        "role" smallint NOT NULL DEFAULT 5,
        CONSTRAINT "PK_workspace_invites" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspace_invites_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_workspace_invites_workspace_email" ON "workspace_invites" ("workspaceId", "email") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_workspace_invites_token" ON "workspace_invites" ("token")`);

    await queryRunner.query(`
      CREATE TABLE "workspace_user_properties" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "filters" jsonb NOT NULL DEFAULT '{}',
        "displayFilters" jsonb NOT NULL DEFAULT '{}',
        "displayProperties" jsonb NOT NULL DEFAULT '{}',
        "navigationProjectLimit" integer NOT NULL DEFAULT 10,
        "navigationControlPreference" text NOT NULL DEFAULT 'ACCORDION',
        CONSTRAINT "PK_workspace_user_properties" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspace_user_properties_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_user_properties_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_workspace_user_properties_workspace_user" ON "workspace_user_properties" ("workspaceId", "userId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "workspace_themes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "name" text NOT NULL,
        "actorId" uuid,
        "colors" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_workspace_themes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspace_themes_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_themes_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_workspace_themes_workspace_name" ON "workspace_themes" ("workspaceId", "name") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workspace_themes"`);
    await queryRunner.query(`DROP TABLE "workspace_user_properties"`);
    await queryRunner.query(`DROP TABLE "workspace_invites"`);
    await queryRunner.query(`DROP TABLE "workspace_members"`);
    await queryRunner.query(`DROP TABLE "workspaces"`);
  }
}
