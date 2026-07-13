import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const addTeamMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
});
