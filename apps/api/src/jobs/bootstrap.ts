import type { Worker } from "bullmq";
import { createWebhookWorker } from "./webhook-worker.js";
import { createMaintenanceWorker } from "./maintenance-worker.js";
import { scheduleRecurringJobs } from "./schedule.js";
import { maintenanceQueue, webhookQueue } from "./queues.js";
import { jobsConnection } from "./connection.js";
import { logger } from "../common/logger.js";

/**
 * Roda workers e agendador no mesmo processo da API — simplificação
 * deliberada para este sandbox (sem deploy multi-processo/Docker). Em
 * produção real isso rodaria em um processo/dyno de worker separado,
 * ambos apontando para o mesmo Redis.
 */
let workers: Worker[] = [];

export async function startJobSystem(): Promise<void> {
  workers = [createWebhookWorker(), createMaintenanceWorker()];
  await scheduleRecurringJobs();
  logger.info("Sistema de jobs (BullMQ) iniciado");
}

export async function stopJobSystem(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  await maintenanceQueue.close();
  await webhookQueue.close();
  jobsConnection.disconnect();
}
