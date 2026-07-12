import { z } from "zod";

const STATE_GROUPS = ["backlog", "unstarted", "started", "completed", "cancelled"] as const;

export const createStateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  color: z.string().min(1).max(255),
  group: z.enum(STATE_GROUPS).default("backlog"),
});

export const updateStateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().min(1).max(255).optional(),
  group: z.enum(STATE_GROUPS).optional(),
  isDefault: z.boolean().optional(),
});
