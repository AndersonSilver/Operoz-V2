import { z } from "zod";

export const createCycleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
});

export const updateCycleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  sortOrder: z.number().optional(),
});

export const dateCheckSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  excludeCycleId: z.string().uuid().optional(),
});

export const cycleIssuesSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1).max(200),
});

export const transferIssuesSchema = z.object({
  targetCycleId: z.string().uuid(),
});
