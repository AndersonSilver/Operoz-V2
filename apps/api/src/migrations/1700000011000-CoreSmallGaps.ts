import { MigrationInterface, QueryRunner } from "typeorm";

export class CoreSmallGaps1700000011000 implements MigrationInterface {
  name = "CoreSmallGaps1700000011000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "createdById" uuid,
        CONSTRAINT "PK_teams" PRIMARY KEY ("id"),
        CONSTRAINT "FK_teams_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_teams_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_teams_workspace_name" ON "teams" ("workspaceId", "name") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "teamId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_team_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_members_team" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_team_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_team_members_team_user" ON "team_members" ("teamId", "userId")`);

    await queryRunner.query(`
      CREATE TABLE "user_recent_visits" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "entityType" text NOT NULL,
        "entityId" uuid NOT NULL,
        "visitedAt" timestamptz NOT NULL,
        CONSTRAINT "PK_user_recent_visits" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_recent_visits_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_recent_visits_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_recent_visits_unique" ON "user_recent_visits" ("workspaceId", "userId", "entityType", "entityId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_recent_visits_lookup" ON "user_recent_visits" ("workspaceId", "userId", "visitedAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE "stickies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "title" text,
        "description" text NOT NULL DEFAULT '',
        "color" text,
        CONSTRAINT "PK_stickies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stickies_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stickies_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_stickies_workspace_user" ON "stickies" ("workspaceId", "userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stickies"`);
    await queryRunner.query(`DROP TABLE "user_recent_visits"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
