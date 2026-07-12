import { z } from "zod";
import { SEGMENT_AXIS_VALUES, X_AXIS_VALUES, Y_AXIS_VALUES } from "./analytics-axis.js";

const csvUuidList = z
  .string()
  .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean));

const axisQueryBaseSchema = z.object({
  xAxis: z.enum(X_AXIS_VALUES),
  yAxis: z.enum(Y_AXIS_VALUES),
  segment: z.enum(SEGMENT_AXIS_VALUES).optional(),
  projectIds: z.array(z.string().uuid()).optional(),
});

export const adhocAnalyticsQuerySchema = z
  .object({
    xAxis: z.enum(X_AXIS_VALUES),
    yAxis: z.enum(Y_AXIS_VALUES),
    segment: z.enum(SEGMENT_AXIS_VALUES).optional(),
    projectIds: csvUuidList.optional(),
  })
  .refine((v) => !v.segment || v.segment !== v.xAxis, {
    message: "segment não pode ser igual a xAxis",
    path: ["segment"],
  });

export const createAnalyticViewSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  query: axisQueryBaseSchema,
});

export const updateAnalyticViewSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  query: axisQueryBaseSchema.optional(),
});
