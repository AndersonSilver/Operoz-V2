import { z } from "zod";

const pointInputSchema = z.object({
  key: z.number().int().min(0),
  value: z.string().min(1).max(20),
  description: z.string().max(2000).optional(),
});

export const createEstimateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  type: z.enum(["points", "categories"]),
  points: z.array(pointInputSchema).min(1).max(20),
});

export const updateEstimateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(["points", "categories"]).optional(),
  points: z.array(pointInputSchema).min(1).max(20).optional(),
});

export const createEstimatePointSchema = pointInputSchema;

export const updateEstimatePointSchema = z.object({
  key: z.number().int().min(0).optional(),
  value: z.string().min(1).max(20).optional(),
  description: z.string().max(2000).optional(),
});

export const removeEstimatePointQuerySchema = z.object({
  newEstimatePointId: z.string().uuid().optional(),
});
