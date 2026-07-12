import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
  name = "InitialSchema1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "email" citext NOT NULL,
        "passwordHash" text,
        "firstName" text NOT NULL DEFAULT '',
        "lastName" text NOT NULL DEFAULT '',
        "displayName" text,
        "avatarUrl" text,
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "isBot" boolean NOT NULL DEFAULT false,
        "timezone" text NOT NULL DEFAULT 'UTC',
        "language" text NOT NULL DEFAULT 'pt-BR',
        "lastLoginAt" timestamptz,
        "lastLoginIp" text,
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "userId" uuid NOT NULL,
        "bio" text,
        "isOnboarded" boolean NOT NULL DEFAULT false,
        "isTourCompleted" boolean NOT NULL DEFAULT false,
        "onboardingStep" integer NOT NULL DEFAULT 0,
        "lastWorkspaceId" uuid,
        "theme" text NOT NULL DEFAULT 'system',
        "startOfWeek" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_profiles_userId" UNIQUE ("userId"),
        CONSTRAINT "FK_profiles_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "userId" uuid NOT NULL,
        "provider" text NOT NULL,
        "providerAccountId" text NOT NULL,
        "providerEmail" text,
        "accessTokenEncrypted" text,
        "refreshTokenEncrypted" text,
        "tokenExpiresAt" timestamptz,
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_accounts_provider_account" ON "accounts" ("provider", "providerAccountId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
