import { maintenanceQueue } from "./queues.js";
import { ARCHIVE_ISSUES_JOB, CLEANUP_EXPORTS_JOB, CLIENT_360_SNAPSHOT_JOB } from "./maintenance-worker.js";

/**
 * Registra os jobs recorrentes. Idempotente: o BullMQ deriva o id do
 * agendamento repetível a partir do padrão cron + nome do job, então
 * chamar isso de novo a cada boot do processo não duplica o schedule.
 */
export async function scheduleRecurringJobs(): Promise<void> {
  await maintenanceQueue.add(
    ARCHIVE_ISSUES_JOB,
    {},
    { repeat: { pattern: "0 3 * * *" }, jobId: ARCHIVE_ISSUES_JOB },
  );
  await maintenanceQueue.add(
    CLEANUP_EXPORTS_JOB,
    {},
    { repeat: { pattern: "30 3 * * *" }, jobId: CLEANUP_EXPORTS_JOB },
  );
  await maintenanceQueue.add(
    CLIENT_360_SNAPSHOT_JOB,
    {},
    { repeat: { pattern: "0 4 * * 1" }, jobId: CLIENT_360_SNAPSHOT_JOB },
  );
}
