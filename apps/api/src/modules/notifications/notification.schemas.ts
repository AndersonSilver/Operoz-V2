import { z } from "zod";
import { booleanQueryParam } from "../../common/zod-helpers.js";

export const listNotificationsQuerySchema = z.object({
  read: booleanQueryParam.optional(),
  snoozed: booleanQueryParam.optional(),
  archived: booleanQueryParam.optional(),
  entityType: z.string().max(50).optional(),
});

export const snoozeNotificationSchema = z.object({
  snoozedTill: z.coerce.date().nullable(),
});

export const markAllReadSchema = z.object({
  entityType: z.string().max(50).optional(),
});

export const updateNotificationPreferenceSchema = z.object({
  propertyChange: z.boolean().optional(),
  stateChange: z.boolean().optional(),
  comment: z.boolean().optional(),
  mention: z.boolean().optional(),
  issueCompleted: z.boolean().optional(),
  channels: z.record(z.string(), z.unknown()).optional(),
  quietHoursStart: z.string().max(8).nullable().optional(),
  quietHoursEnd: z.string().max(8).nullable().optional(),
  quietHoursTimezone: z.string().max(64).optional(),
});
