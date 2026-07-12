import { z } from "zod";
import { WORKSPACE_ROLE_VALUES } from "../../common/roles.js";

const identifierSchema = z
  .string()
  .min(1)
  .max(12)
  .regex(/^[A-Za-z0-9]+$/, "Identifier deve conter apenas letras e números.");

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  identifier: identifierSchema,
  description: z.string().max(5000).optional(),
  network: z.union([z.literal(0), z.literal(2)]).default(2),
  projectLeadId: z.string().uuid().nullable().optional(),
  defaultAssigneeId: z.string().uuid().nullable().optional(),
  emoji: z.string().max(32).nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  network: z.union([z.literal(0), z.literal(2)]).optional(),
  projectLeadId: z.string().uuid().nullable().optional(),
  defaultAssigneeId: z.string().uuid().nullable().optional(),
  emoji: z.string().max(32).nullable().optional(),
  coverImageUrl: z.string().max(2048).nullable().optional(),
  moduleView: z.boolean().optional(),
  cycleView: z.boolean().optional(),
  issueViewsView: z.boolean().optional(),
  pageView: z.boolean().optional(),
  intakeView: z.boolean().optional(),
  supportView: z.boolean().optional(),
  isTimeTrackingEnabled: z.boolean().optional(),
  guestViewAllFeatures: z.boolean().optional(),
  archiveIn: z.number().int().min(0).max(12).optional(),
  closeIn: z.number().int().min(0).max(12).optional(),
  timezone: z.string().max(64).optional(),
});

export const identifierCheckQuerySchema = z.object({
  identifier: identifierSchema,
});

const roleSchema = z
  .number()
  .int()
  .refine((v) => (WORKSPACE_ROLE_VALUES as readonly number[]).includes(v), { message: "Papel inválido." });

export const addProjectMembersSchema = z.object({
  members: z
    .array(z.object({ userId: z.string().uuid(), role: roleSchema }))
    .min(1)
    .max(50),
});

export const updateProjectMemberRoleSchema = z.object({
  role: roleSchema,
});

export const updateProjectMemberPreferencesSchema = z.object({
  preferences: z.record(z.string(), z.unknown()),
});

export const createProjectInvitesSchema = z.object({
  invites: z
    .array(
      z.object({
        email: z.string().email().max(255),
        role: roleSchema.default(5),
        message: z.string().max(1000).nullable().optional(),
      }),
    )
    .min(1)
    .max(50),
});

export const acceptPendingProjectInvitesSchema = z.object({
  inviteIds: z.array(z.string().uuid()).min(1).max(50),
});

export const favoriteSchema = z.object({
  entityType: z.string().min(1).max(50),
  entityId: z.string().uuid(),
});
