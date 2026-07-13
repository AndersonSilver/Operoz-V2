import { z } from "zod";
import { WORKSPACE_ROLE_VALUES } from "../../common/roles.js";

export const createBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
});

export const addBoardProjectSchema = z.object({
  projectId: z.string().uuid(),
});

const roleSchema = z.number().int().refine((v) => (WORKSPACE_ROLE_VALUES as readonly number[]).includes(v), {
  message: "Papel inválido.",
});

export const addBoardMemberSchema = z.object({
  userId: z.string().uuid(),
  role: roleSchema.default(15),
});

export const updateBoardMemberSchema = z.object({
  role: roleSchema,
});
