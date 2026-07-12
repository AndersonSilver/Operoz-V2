import { z } from "zod";

export const createCommentSchema = z.object({
  commentJson: z.record(z.string(), z.unknown()).optional(),
  commentHtml: z.string().max(200_000).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateCommentSchema = z.object({
  commentJson: z.record(z.string(), z.unknown()).optional(),
  commentHtml: z.string().max(200_000).optional(),
});

export const createAttachmentSchema = z.object({
  assetUrl: z.string().url().max(2048),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().max(255).nullable().optional(),
  size: z.number().int().min(0).optional(),
});

export const createLinkSchema = z.object({
  url: z.string().min(1).max(2048),
  title: z.string().max(255).nullable().optional(),
});

export const updateLinkSchema = z.object({
  url: z.string().min(1).max(2048).optional(),
  title: z.string().max(255).nullable().optional(),
});

export const reactionSchema = z.object({
  reaction: z.string().min(1).max(32),
});

export const createRelationSchema = z.object({
  relatedIssueId: z.string().uuid(),
  relationType: z.string().min(1).max(30),
});

export const bulkAssignParentSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1).max(200),
});
