import { z } from "zod";

export const createViewSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  displayFilters: z.record(z.string(), z.unknown()).optional(),
  displayProperties: z.record(z.string(), z.unknown()).optional(),
  access: z.union([z.literal(0), z.literal(1)]).optional(),
  logoProps: z.record(z.string(), z.unknown()).optional(),
});

export const updateViewSchema = createViewSchema.partial();
