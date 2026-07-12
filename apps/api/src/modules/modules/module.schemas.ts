import { z } from "zod";

const STATUSES = ["backlog", "planned", "in-progress", "paused", "completed", "cancelled"] as const;

export const createModuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  startDate: z.string().date().nullable().optional(),
  targetDate: z.string().date().nullable().optional(),
  status: z.enum(STATUSES).optional(),
  leadId: z.string().uuid().nullable().optional(),
});

export const updateModuleSchema = createModuleSchema.partial().extend({
  sortOrder: z.number().optional(),
});

export const moduleIssuesSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1).max(200),
});

export const setIssueModulesSchema = z.object({
  moduleIds: z.array(z.string().uuid()).max(50),
});

export const moduleLinkSchema = z.object({
  url: z.string().min(1).max(2048),
  title: z.string().max(255).nullable().optional(),
});
