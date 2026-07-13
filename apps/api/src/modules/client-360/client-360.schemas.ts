import { z } from "zod";

export const healthHistoryQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(12),
});

export const updateHealthSettingsSchema = z
  .object({
    weightReport: z.number().int().min(0).max(100).optional(),
    weightOverdue: z.number().int().min(0).max(100).optional(),
    weightSupport: z.number().int().min(0).max(100).optional(),
    thresholdOkMin: z.number().int().min(0).max(100).optional(),
    thresholdWarningMin: z.number().int().min(0).max(100).optional(),
    scoreAlertThreshold: z.number().int().min(0).max(100).optional(),
    supportSlaDays: z.number().int().min(1).max(90).optional(),
  })
  .refine((v) => v.thresholdWarningMin === undefined || v.thresholdOkMin === undefined || v.thresholdWarningMin <= v.thresholdOkMin, {
    message: "thresholdWarningMin não pode ser maior que thresholdOkMin.",
    path: ["thresholdWarningMin"],
  });
