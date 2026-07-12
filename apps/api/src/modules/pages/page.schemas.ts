import { z } from "zod";

export const createPageSchema = z.object({
  name: z.string().max(255).optional(),
  descriptionJson: z.record(z.string(), z.unknown()).optional(),
  descriptionHtml: z.string().max(500_000).optional(),
  parentId: z.string().uuid().nullable().optional(),
  access: z.union([z.literal(0), z.literal(1)]).optional(),
});

export const updatePageSchema = z.object({
  name: z.string().max(255).optional(),
  color: z.string().max(32).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  logoProps: z.record(z.string(), z.unknown()).optional(),
  viewProps: z.record(z.string(), z.unknown()).optional(),
});

export const updatePageDescriptionSchema = z.object({
  descriptionJson: z.record(z.string(), z.unknown()).optional(),
  descriptionHtml: z.string().max(500_000).optional(),
});

export const changePageAccessSchema = z.object({
  access: z.union([z.literal(0), z.literal(1)]),
});
