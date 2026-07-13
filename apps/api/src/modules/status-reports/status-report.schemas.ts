import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD.");

export const createStatusReportSchema = z.object({
  moduleId: z.string().uuid().nullable().optional(),
  title: z.string().max(255).optional(),
  periodStart: isoDate,
  periodEnd: isoDate,
  content: z.record(z.unknown()).optional(),
});

export const updateStatusReportSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.record(z.unknown()).optional(),
});
