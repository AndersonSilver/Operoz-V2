import { z } from "zod";

export const createWebhookSchema = z.object({
  url: z.string().url().max(1024),
  isActive: z.boolean().optional(),
  eventProject: z.boolean().optional(),
  eventIssue: z.boolean().optional(),
  eventModule: z.boolean().optional(),
  eventCycle: z.boolean().optional(),
  eventIssueComment: z.boolean().optional(),
});

export const updateWebhookSchema = createWebhookSchema.partial();
