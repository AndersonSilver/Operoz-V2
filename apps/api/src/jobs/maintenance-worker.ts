import { Worker, type Job } from "bullmq";
import { jobsConnection } from "./connection.js";
import { MAINTENANCE_QUEUE } from "./queues.js";
import { runArchiveAndCloseJob } from "../modules/issues/archive-job.js";
import { exportService } from "../modules/exports/export.service.js";
import { logger } from "../common/logger.js";

export const ARCHIVE_ISSUES_JOB = "archive-issues";
export const CLEANUP_EXPORTS_JOB = "cleanup-exports";

async function process(job: Job): Promise<void> {
  switch (job.name) {
    case ARCHIVE_ISSUES_JOB: {
      const { archived, closed } = await runArchiveAndCloseJob();
      logger.info({ archived, closed }, "Job de arquivamento de issues concluído");
      return;
    }
    case CLEANUP_EXPORTS_JOB: {
      const count = await exportService.cleanupExpiredExports();
      logger.info({ count }, "Job de limpeza de exports concluído");
      return;
    }
    default:
      logger.warn({ jobName: job.name }, "Job de manutenção desconhecido, ignorando");
  }
}

export function createMaintenanceWorker(): Worker {
  const worker = new Worker(MAINTENANCE_QUEUE, process, {
    connection: jobsConnection,
    concurrency: 1,
  });

  worker.on("error", (err) => logger.error({ err }, "Erro no worker de manutenção"));
  worker.on("failed", (job, err) => logger.error({ err, jobName: job?.name }, "Job de manutenção falhou"));

  return worker;
}
