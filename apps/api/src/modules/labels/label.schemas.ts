import { z } from "zod";

export const createLabelSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  color: z.string().max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().optional(),
});

export const bulkCreateLabelsSchema = z.object({
  labels: z
    .array(z.object({ name: z.string().min(1).max(255), color: z.string().max(255).optional() }))
    .min(1)
    .max(100),
});
