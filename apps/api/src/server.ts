import { createApp } from "./app.js";
import { AppDataSource } from "./config/data-source.js";
import { env } from "./config/env.js";
import { logger } from "./common/logger.js";
import { redis } from "./common/redis.js";

async function main() {
  await AppDataSource.initialize();
  logger.info("Conectado ao Postgres");

  await redis.ping();
  logger.info("Conectado ao Redis");

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API rodando em http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} recebido, encerrando graciosamente...`);
    server.close(async () => {
      await AppDataSource.destroy();
      redis.disconnect();
      process.exit(0);
    });
    // Força saída se não encerrar em 10s.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "Falha ao iniciar a aplicação");
  process.exit(1);
});
