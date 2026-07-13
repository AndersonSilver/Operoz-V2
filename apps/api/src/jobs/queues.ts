import { Queue } from "bullmq";
import { jobsConnection } from "./connection.js";

export const MAINTENANCE_QUEUE = "maintenance";
export const WEBHOOK_QUEUE = "webhook-delivery";

const defaultJobOptions = {
  removeOnComplete: { age: 24 * 60 * 60 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export const maintenanceQueue = new Queue(MAINTENANCE_QUEUE, {
  connection: jobsConnection,
  defaultJobOptions,
});

export const webhookQueue = new Queue(WEBHOOK_QUEUE, {
  connection: jobsConnection,
  defaultJobOptions,
});

export type WebhookDeliverJobData = {
  webhookId: string;
  event: string;
  action: string;
  data: Record<string, unknown>;
};
