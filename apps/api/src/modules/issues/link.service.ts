import { IssueLink } from "../../entities/issue-link.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { logIssueActivity } from "./issue-activity.service.js";
import { AppDataSource } from "../../config/data-source.js";

class LinkService {
  async list(issueId: string) {
    return IssueLink.find({ where: { issueId }, order: { createdAt: "DESC" } });
  }

  async create(project: Project, actor: User, issueId: string, input: { url: string; title?: string | null }) {
    let url: URL;
    try {
      url = new URL(input.url);
    } catch {
      throw new ApiError(422, "invalid_url", "URL inválida.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ApiError(422, "invalid_url", "Apenas links http/https são permitidos.");
    }

    const existing = await IssueLink.findOne({ where: { issueId, url: input.url } });
    if (existing) {
      throw new ApiError(409, "link_already_exists", "Este link já foi adicionado nesta issue.");
    }

    const link = IssueLink.create({ issueId, url: input.url, title: input.title ?? null });
    await link.save();

    await AppDataSource.transaction(async (manager) => {
      await logIssueActivity(manager, {
        issueId,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "updated",
        field: "link",
        newValue: input.url,
      });
    });

    return link;
  }

  async findOrThrow(issueId: string, linkId: string): Promise<IssueLink> {
    const link = await IssueLink.findOne({ where: { id: linkId, issueId } });
    if (!link) {
      throw new ApiError(404, "link_not_found", "Link não encontrado.");
    }
    return link;
  }

  async update(link: IssueLink, input: { url?: string; title?: string | null }) {
    if (input.url !== undefined) link.url = input.url;
    if (input.title !== undefined) link.title = input.title;
    await link.save();
    return link;
  }

  async remove(project: Project, actor: User, link: IssueLink) {
    await link.remove();
    await AppDataSource.transaction(async (manager) => {
      await logIssueActivity(manager, {
        issueId: link.issueId,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "deleted",
        field: "link",
        oldValue: link.url,
      });
    });
  }
}

export const linkService = new LinkService();
