import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env.js";
import { User } from "../entities/user.entity.js";
import { Profile } from "../entities/profile.entity.js";
import { Account } from "../entities/account.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  // Nunca deixar o TypeORM alterar o schema automaticamente — migrations
  // são a única fonte de verdade, inclusive em desenvolvimento.
  synchronize: false,
  logging: env.isDevelopment ? ["error", "warn", "migration"] : ["error"],
  entities: [User, Profile, Account],
  migrations: [env.isProduction ? "dist/migrations/*.js" : "src/migrations/*.ts"],
  migrationsTableName: "migrations_history",
});
