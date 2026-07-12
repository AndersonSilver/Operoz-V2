import { IssueReaction } from "../../entities/issue-reaction.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";

class ReactionService {
  async list(issueId: string) {
    return IssueReaction.find({ where: { issueId } });
  }

  async add(issueId: string, actor: User, reaction: string) {
    const existing = await IssueReaction.findOne({ where: { issueId, actorId: actor.id, reaction } });
    if (existing) {
      throw new ApiError(409, "reaction_already_exists", "Você já reagiu com este emoji.");
    }
    const row = IssueReaction.create({ issueId, actorId: actor.id, reaction });
    await row.save();
    return row;
  }

  async remove(issueId: string, reactionId: string) {
    const row = await IssueReaction.findOne({ where: { id: reactionId, issueId } });
    if (!row) {
      throw new ApiError(404, "reaction_not_found", "Reação não encontrada.");
    }
    await row.remove();
  }
}

export const reactionService = new ReactionService();
