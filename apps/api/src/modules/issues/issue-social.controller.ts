import type { Request, Response } from "express";
import { commentService } from "./comment.service.js";
import { attachmentService } from "./attachment.service.js";
import { linkService } from "./link.service.js";
import { reactionService } from "./reaction.service.js";
import { subscriberService } from "./subscriber.service.js";
import { issueRelationService } from "./issue-relation.service.js";
import { issueService } from "./issue.service.js";
import {
  bulkAssignParentSchema,
  createAttachmentSchema,
  createCommentSchema,
  createLinkSchema,
  createRelationSchema,
  reactionSchema,
  updateCommentSchema,
  updateLinkSchema,
} from "./issue-social.schemas.js";

export const commentController = {
  async list(req: Request, res: Response) {
    res.json({ comments: await commentService.list(req.issue!.id) });
  },
  async create(req: Request, res: Response) {
    const input = createCommentSchema.parse(req.body);
    const comment = await commentService.create(req.project!, req.user!, req.issue!.id, input);
    res.status(201).json({ comment });
  },
  async update(req: Request, res: Response) {
    const input = updateCommentSchema.parse(req.body);
    const comment = await commentService.findOrThrow(req.issue!.id, req.params.commentId!);
    const updated = await commentService.update(req.project!, req.user!, comment, input);
    res.json({ comment: updated });
  },
  async remove(req: Request, res: Response) {
    const comment = await commentService.findOrThrow(req.issue!.id, req.params.commentId!);
    await commentService.remove(req.project!, req.user!, comment);
    res.status(204).send();
  },
  async listReactions(req: Request, res: Response) {
    res.json({ reactions: await commentService.listReactions(req.params.commentId!) });
  },
  async addReaction(req: Request, res: Response) {
    const { reaction } = reactionSchema.parse(req.body);
    const comment = await commentService.findOrThrow(req.issue!.id, req.params.commentId!);
    const row = await commentService.addReaction(comment, req.user!, reaction);
    res.status(201).json({ reaction: row });
  },
  async removeReaction(req: Request, res: Response) {
    const comment = await commentService.findOrThrow(req.issue!.id, req.params.commentId!);
    await commentService.removeReaction(comment, req.params.reactionId!);
    res.status(204).send();
  },
};

export const attachmentController = {
  async list(req: Request, res: Response) {
    res.json({ attachments: await attachmentService.list(req.issue!.id) });
  },
  async create(req: Request, res: Response) {
    const input = createAttachmentSchema.parse(req.body);
    const attachment = await attachmentService.create(req.project!, req.user!, req.issue!.id, input);
    res.status(201).json({ attachment });
  },
  async remove(req: Request, res: Response) {
    const attachment = await attachmentService.findOrThrow(req.issue!.id, req.params.attachmentId!);
    await attachmentService.remove(req.project!, req.user!, attachment);
    res.status(204).send();
  },
};

export const linkController = {
  async list(req: Request, res: Response) {
    res.json({ links: await linkService.list(req.issue!.id) });
  },
  async create(req: Request, res: Response) {
    const input = createLinkSchema.parse(req.body);
    const link = await linkService.create(req.project!, req.user!, req.issue!.id, input);
    res.status(201).json({ link });
  },
  async update(req: Request, res: Response) {
    const input = updateLinkSchema.parse(req.body);
    const link = await linkService.findOrThrow(req.issue!.id, req.params.linkId!);
    const updated = await linkService.update(link, input);
    res.json({ link: updated });
  },
  async remove(req: Request, res: Response) {
    const link = await linkService.findOrThrow(req.issue!.id, req.params.linkId!);
    await linkService.remove(req.project!, req.user!, link);
    res.status(204).send();
  },
};

export const issueReactionController = {
  async list(req: Request, res: Response) {
    res.json({ reactions: await reactionService.list(req.issue!.id) });
  },
  async add(req: Request, res: Response) {
    const { reaction } = reactionSchema.parse(req.body);
    const row = await reactionService.add(req.issue!.id, req.user!, reaction);
    res.status(201).json({ reaction: row });
  },
  async remove(req: Request, res: Response) {
    await reactionService.remove(req.issue!.id, req.params.reactionId!);
    res.status(204).send();
  },
};

export const subscriberController = {
  async list(req: Request, res: Response) {
    res.json({ subscribers: await subscriberService.list(req.issue!.id) });
  },
  async subscribe(req: Request, res: Response) {
    await subscriberService.ensureSubscribed(req.issue!.id, req.user!.id);
    res.status(204).send();
  },
  async unsubscribe(req: Request, res: Response) {
    await subscriberService.unsubscribe(req.issue!.id, req.user!.id);
    res.status(204).send();
  },
};

export const relationController = {
  async list(req: Request, res: Response) {
    res.json({ relations: await issueRelationService.listForIssue(req.issue!.id) });
  },
  async create(req: Request, res: Response) {
    const input = createRelationSchema.parse(req.body);
    const relation = await issueRelationService.create(req.project!, req.user!, req.issue!.id, input);
    res.status(201).json({ relation });
  },
  async remove(req: Request, res: Response) {
    await issueRelationService.remove(req.issue!.id, req.params.relationId!);
    res.status(204).send();
  },
};

export const subIssueController = {
  async list(req: Request, res: Response) {
    res.json(await issueService.getSubIssues(req.project!, req.issue!.id));
  },
  async bulkAssign(req: Request, res: Response) {
    const { issueIds } = bulkAssignParentSchema.parse(req.body);
    await issueService.bulkAssignParent(req.project!, req.user!, req.issue!.id, issueIds);
    res.status(204).send();
  },
};

export const issueActivityController = {
  async timeline(req: Request, res: Response) {
    const [activities, comments] = await Promise.all([
      issueService.getActivityTimeline(req.issue!.id),
      commentService.list(req.issue!.id),
    ]);
    res.json({ activities, comments });
  },
};
