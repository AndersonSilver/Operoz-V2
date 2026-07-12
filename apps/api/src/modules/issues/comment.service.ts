import { IssueComment } from "../../entities/issue-comment.entity.js";
import { CommentReaction } from "../../entities/comment-reaction.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { logIssueActivity } from "./issue-activity.service.js";
import { AppDataSource } from "../../config/data-source.js";
import { subscriberService } from "./subscriber.service.js";

class CommentService {
  async list(issueId: string) {
    return IssueComment.find({ where: { issueId }, order: { createdAt: "ASC" } });
  }

  async create(
    project: Project,
    actor: User,
    issueId: string,
    input: { commentJson?: Record<string, unknown>; commentHtml?: string; parentId?: string | null },
  ) {
    if (input.parentId) {
      const parent = await IssueComment.findOne({ where: { id: input.parentId, issueId } });
      if (!parent) {
        throw new ApiError(422, "invalid_parent_comment", "Comentário-pai não encontrado nesta issue.");
      }
    }

    const comment = IssueComment.create({
      issueId,
      actorId: actor.id,
      commentJson: input.commentJson ?? {},
      commentHtml: input.commentHtml ?? "<p></p>",
      parentId: input.parentId ?? null,
    });
    await comment.save();

    await AppDataSource.transaction(async (manager) => {
      await logIssueActivity(manager, {
        issueId,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "commented",
      });
    });

    // Auto-subscribe de quem comenta pela primeira vez (best-effort, idempotente).
    await subscriberService.ensureSubscribed(issueId, actor.id);

    return comment;
  }

  async findOrThrow(issueId: string, commentId: string): Promise<IssueComment> {
    const comment = await IssueComment.findOne({ where: { id: commentId, issueId } });
    if (!comment) {
      throw new ApiError(404, "comment_not_found", "Comentário não encontrado.");
    }
    return comment;
  }

  async update(
    project: Project,
    actor: User,
    comment: IssueComment,
    input: { commentJson?: Record<string, unknown>; commentHtml?: string },
  ) {
    const changed = input.commentJson !== undefined || input.commentHtml !== undefined;
    if (input.commentJson !== undefined) comment.commentJson = input.commentJson;
    if (input.commentHtml !== undefined) comment.commentHtml = input.commentHtml;
    if (changed) comment.editedAt = new Date();
    await comment.save();

    if (changed) {
      await AppDataSource.transaction(async (manager) => {
        await logIssueActivity(manager, {
          issueId: comment.issueId,
          projectId: project.id,
          workspaceId: project.workspaceId,
          actorId: actor.id,
          verb: "updated",
          field: "comment",
        });
      });
    }
    return comment;
  }

  async remove(project: Project, actor: User, comment: IssueComment) {
    await comment.remove();
    await AppDataSource.transaction(async (manager) => {
      await logIssueActivity(manager, {
        issueId: comment.issueId,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "deleted",
        field: "comment",
      });
    });
  }

  async addReaction(comment: IssueComment, actor: User, reaction: string) {
    const existing = await CommentReaction.findOne({ where: { commentId: comment.id, actorId: actor.id, reaction } });
    if (existing) {
      throw new ApiError(409, "reaction_already_exists", "Você já reagiu com este emoji.");
    }
    const row = CommentReaction.create({ commentId: comment.id, actorId: actor.id, reaction });
    await row.save();
    return row;
  }

  async removeReaction(comment: IssueComment, reactionId: string) {
    const row = await CommentReaction.findOne({ where: { id: reactionId, commentId: comment.id } });
    if (!row) {
      throw new ApiError(404, "reaction_not_found", "Reação não encontrada.");
    }
    await row.remove();
  }

  async listReactions(commentId: string) {
    return CommentReaction.find({ where: { commentId } });
  }
}

export const commentService = new CommentService();
