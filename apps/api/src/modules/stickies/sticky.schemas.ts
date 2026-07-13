import { z } from "zod";

export const createStickySchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(20_000).default(""),
  color: z.string().max(50).optional(),
});

export const updateStickySchema = z.object({
  title: z.string().max(255).nullable().optional(),
  description: z.string().max(20_000).optional(),
  color: z.string().max(50).nullable().optional(),
});

export const listStickiesQuerySchema = z.object({
  query: z.string().max(255).optional(),
});
