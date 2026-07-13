import { MigrationInterface, QueryRunner } from "typeorm";

export class Assets1700000014000 implements MigrationInterface {
  name = "Assets1700000014000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "uploadedById" uuid,
        "storageKey" text NOT NULL,
        "fileName" text NOT NULL,
        "mimeType" text NOT NULL,
        "size" integer NOT NULL,
        CONSTRAINT "PK_assets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assets_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assets_uploaded_by" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_assets_workspace" ON "assets" ("workspaceId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assets"`);
  }
}
