import { MigrationInterface, QueryRunner } from "typeorm";

export class Notifications1700000008000 implements MigrationInterface {
  name = "Notifications1700000008000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "workspaceId" uuid NOT NULL,
        "projectId" uuid,
        "entityType" text NOT NULL,
        "entityIdentifier" uuid,
        "title" text NOT NULL,
        "messageHtml" text NOT NULL DEFAULT '<p></p>',
        "data" jsonb NOT NULL DEFAULT '{}',
        "sender" text NOT NULL,
        "triggeredById" uuid,
        "receiverId" uuid NOT NULL,
        "readAt" timestamptz,
        "snoozedTill" timestamptz,
        "archivedAt" timestamptz,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_workspace" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_project" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notifications_triggered_by" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notifications_receiver" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_receiver_ws_read" ON "notifications" ("receiverId", "workspaceId", "readAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_receiver_ws_archived_snoozed" ON "notifications" ("receiverId", "workspaceId", "archivedAt", "snoozedTill")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_notification_preferences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "userId" uuid NOT NULL,
        "propertyChange" boolean NOT NULL DEFAULT true,
        "stateChange" boolean NOT NULL DEFAULT true,
        "comment" boolean NOT NULL DEFAULT true,
        "mention" boolean NOT NULL DEFAULT true,
        "issueCompleted" boolean NOT NULL DEFAULT true,
        "channels" jsonb NOT NULL DEFAULT '{"email":{"enabled":true,"frequency":"immediate"},"in_app":{"enabled":true}}',
        "quietHoursStart" text,
        "quietHoursEnd" text,
        "quietHoursTimezone" text NOT NULL DEFAULT 'UTC',
        CONSTRAINT "PK_user_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_notification_preferences_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_notification_preferences_user" ON "user_notification_preferences" ("userId") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_notification_preferences"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
