import { IssueAttachment } from "../../entities/issue-attachment.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { logIssueActivity } from "./issue-activity.service.js";
import { AppDataSource } from "../../config/data-source.js";

const MAX_SIZE_BYTES = 25 * 1024 * 1024;
const DEFAULT_ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/", "application/zip"];

class AttachmentService {
  async list(issueId: string) {
    return IssueAttachment.find({ where: { issueId }, order: { createdAt: "DESC" } });
  }

  async create(
    project: Project,
    actor: User,
    issueId: string,
    input: { assetUrl: string; fileName: string; mimeType?: string | null; size?: number },
  ) {
    if (input.size !== undefined && input.size > MAX_SIZE_BYTES) {
      throw new ApiError(422, "attachment_too_large", "Arquivo excede o limite de tamanho permitido.");
    }
    if (input.mimeType && !DEFAULT_ALLOWED_MIME_PREFIXES.some((prefix) => input.mimeType!.startsWith(prefix))) {
      throw new ApiError(422, "attachment_type_not_allowed", "Tipo de arquivo não permitido.");
    }
    // Sanitização básica contra path traversal no nome exibido.
    const fileName = input.fileName.replace(/[/\\]/g, "_").replace(/\.\./g, "_");

    const attachment = IssueAttachment.create({
      issueId,
      uploadedById: actor.id,
      assetUrl: input.assetUrl,
      fileName,
      mimeType: input.mimeType ?? null,
      size: input.size ?? 0,
    });
    await attachment.save();

    await AppDataSource.transaction(async (manager) => {
      await logIssueActivity(manager, {
        issueId,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "updated",
        field: "attachment",
        newValue: fileName,
      });
    });

    return attachment;
  }

  async findOrThrow(issueId: string, attachmentId: string): Promise<IssueAttachment> {
    const attachment = await IssueAttachment.findOne({ where: { id: attachmentId, issueId } });
    if (!attachment) {
      throw new ApiError(404, "attachment_not_found", "Anexo não encontrado.");
    }
    return attachment;
  }

  async remove(project: Project, actor: User, attachment: IssueAttachment) {
    await attachment.remove();
    await AppDataSource.transaction(async (manager) => {
      await logIssueActivity(manager, {
        issueId: attachment.issueId,
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId: actor.id,
        verb: "deleted",
        field: "attachment",
        oldValue: attachment.fileName,
      });
    });
  }
}

export const attachmentService = new AttachmentService();
