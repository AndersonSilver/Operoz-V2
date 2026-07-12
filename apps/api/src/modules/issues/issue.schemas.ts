import { z } from "zod";

const PRIORITIES = ["urgent", "high", "medium", "low", "none"] as const;
const STATE_GROUPS = ["backlog", "unstarted", "started", "completed", "cancelled"] as const;

export const createIssueSchema = z.object({
  name: z.string().min(1).max(255),
  descriptionJson: z.record(z.string(), z.unknown()).optional(),
  descriptionHtml: z.string().max(200_000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  stateId: z.string().uuid().optional(),
  point: z.number().int().min(0).max(12).nullable().optional(),
  estimatePointId: z.string().uuid().nullable().optional(),
  startDate: z.string().date().nullable().optional(),
  targetDate: z.string().date().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
  labelIds: z.array(z.string().uuid()).max(50).optional(),
});

export const updateIssueSchema = createIssueSchema.partial();

export const listIssuesQuerySchema = z.object({
  stateId: z.string().uuid().optional(),
  stateGroup: z.enum(STATE_GROUPS).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().uuid().optional(),
  labelId: z.string().uuid().optional(),
  createdById: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  isArchived: z.coerce.boolean().optional(),
});

export const bulkUpdateIssuesSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1).max(200),
  stateId: z.string().uuid().optional(),
  priority: z.enum(PRIORITIES).optional(),
  estimatePointId: z.string().uuid().nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
  labelIds: z.array(z.string().uuid()).max(50).optional(),
});

export const bulkIssueIdsSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1).max(200),
});

export const createDraftIssueSchema = z.object({
  name: z.string().max(255).nullable().optional(),
  descriptionJson: z.record(z.string(), z.unknown()).optional(),
  descriptionHtml: z.string().max(200_000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  stateId: z.string().uuid().nullable().optional(),
  estimatePointId: z.string().uuid().nullable().optional(),
  startDate: z.string().date().nullable().optional(),
  targetDate: z.string().date().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
  labelIds: z.array(z.string().uuid()).max(50).optional(),
});

export const updateDraftIssueSchema = createDraftIssueSchema.partial();
