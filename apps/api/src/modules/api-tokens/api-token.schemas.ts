import { z } from "zod";

export const createApiTokenSchema = z.object({
  label: z.string().max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const updateApiTokenSchema = z.object({
  label: z.string().max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});
