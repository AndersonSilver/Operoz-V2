import { Redis } from "ioredis";
import { env } from "../config/env.js";

/**
 * BullMQ exige `maxRetriesPerRequest: null` na conexão usada por Queue/Worker
 * (comandos bloqueantes internos) — por isso uma conexão dedicada, separada
 * do cliente Redis genérico usado por sessão/rate-limit (`common/redis.ts`).
 */
export const jobsConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
