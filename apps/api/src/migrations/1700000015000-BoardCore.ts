import { MigrationInterface, QueryRunner } from "typeorm";

export class BoardCore1700000015000 implements MigrationInterface {
  name = "BoardCore1700000015000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "boards" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "createdById" uuid,
        "archivedAt" timestamptz,
        CONSTRAINT "PK_boards" PRIMARY KEY ("id"),
        CONSTRAINT "FK_boards_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_boards_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_boards_workspace" ON "boards" ("workspaceId")`);

    await queryRunner.query(`
      CREATE TABLE "board_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "boardId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" smallint NOT NULL DEFAULT 15,
        CONSTRAINT "PK_board_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_board_members_board" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_board_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_board_members_board_user" ON "board_members" ("boardId", "userId") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "board_projects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "boardId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        CONSTRAINT "PK_board_projects" PRIMARY KEY ("id"),
        CONSTRAINT "FK_board_projects_board" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_board_projects_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_board_projects_board_project" ON "board_projects" ("boardId", "projectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "board_projects"`);
    await queryRunner.query(`DROP TABLE "board_members"`);
    await queryRunner.query(`DROP TABLE "boards"`);
  }
}
