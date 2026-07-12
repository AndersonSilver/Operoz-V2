import { z } from "zod";
import { WORKSPACE_ROLE_VALUES } from "../../common/roles.js";

const slugSchema = z
  .string()
  .min(1)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens.");

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
  slug: slugSchema,
  organizationSize: z.string().max(20).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  organizationSize: z.string().max(20).nullable().optional(),
  timezone: z.string().max(64).optional(),
  logoUrl: z.string().max(2048).nullable().optional(),
  notifyAssigneesAlwaysByEmail: z.boolean().optional(),
  notifyEmailIncludeExtendedActivities: z.boolean().optional(),
  notifyEmailIncludeDescriptionChanges: z.boolean().optional(),
  notifyEmailDispatchImmediately: z.boolean().optional(),
});

export const slugCheckQuerySchema = z.object({
  slug: slugSchema,
});

export const transferOwnershipSchema = z.object({
  newOwnerUserId: z.string().uuid(),
});

const roleSchema = z.number().int().refine((v) => (WORKSPACE_ROLE_VALUES as readonly number[]).includes(v), {
  message: "Papel inválido.",
});

export const createInvitesSchema = z.object({
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

export const updateMemberRoleSchema = z.object({
  role: roleSchema,
});

export const acceptPendingInvitesSchema = z.object({
  inviteIds: z.array(z.string().uuid()).min(1).max(50),
});

export const updateUserPropertiesSchema = z.object({
  filters: z.record(z.string(), z.unknown()).optional(),
  displayFilters: z.record(z.string(), z.unknown()).optional(),
  displayProperties: z.record(z.string(), z.unknown()).optional(),
  navigationProjectLimit: z.number().int().min(1).max(100).optional(),
  navigationControlPreference: z.enum(["ACCORDION", "TABBED"]).optional(),
});

export const workspaceThemeSchema = z.object({
  name: z.string().min(1).max(300),
  colors: z.record(z.string(), z.string()).default({}),
});
