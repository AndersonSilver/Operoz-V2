import { Issue } from "../../entities/issue.entity.js";
import { IssueVersion } from "../../entities/issue-version.entity.js";
import { IssueDescriptionVersion } from "../../entities/issue-description-version.entity.js";
import { ApiError } from "../../common/api-error.js";

const DESCRIPTION_DEBOUNCE_MS = 10 * 60 * 1000;
const MAX_DESCRIPTION_VERSIONS = 20;

const SNAPSHOT_FIELDS = [
  "name",
  "descriptionJson",
  "descriptionHtml",
  "priority",
  "stateId",
  "point",
  "estimatePointId",
  "startDate",
  "targetDate",
  "parentId",
] as const;

class IssueVersionService {
  /** Snapshot completo — chamado ao final de toda atualização substantiva da issue. */
  async trackIssueVersion(issue: Issue, actorId: string): Promise<void> {
    const snapshot: Record<string, unknown> = {};
    for (const field of SNAPSHOT_FIELDS) snapshot[field] = issue[field];

    await IssueVersion.create({
      issueId: issue.id,
      snapshot,
      savedById: actorId,
    }).save();
  }

  async listIssueVersions(issueId: string): Promise<IssueVersion[]> {
    return IssueVersion.find({ where: { issueId }, order: { createdAt: "DESC" } });
  }

  /** Espelha `page.service.ts#trackVersion`: debounce de 10min, mantém as 20 mais recentes. */
  async trackDescriptionVersion(issue: Issue, actorId: string): Promise<void> {
    const latest = await IssueDescriptionVersion.findOne({
      where: { issueId: issue.id },
      order: { createdAt: "DESC" },
    });
    const withinDebounce = latest && Date.now() - latest.createdAt.getTime() < DESCRIPTION_DEBOUNCE_MS;

    if (withinDebounce) {
      latest.descriptionJson = issue.descriptionJson;
      latest.descriptionHtml = issue.descriptionHtml;
      await latest.save();
      return;
    }

    await IssueDescriptionVersion.create({
      issueId: issue.id,
      descriptionJson: issue.descriptionJson,
      descriptionHtml: issue.descriptionHtml,
      savedById: actorId,
    }).save();

    const count = await IssueDescriptionVersion.count({ where: { issueId: issue.id } });
    if (count > MAX_DESCRIPTION_VERSIONS) {
      const oldest = await IssueDescriptionVersion.find({
        where: { issueId: issue.id },
        order: { createdAt: "ASC" },
        take: count - MAX_DESCRIPTION_VERSIONS,
      });
      await IssueDescriptionVersion.getRepository().remove(oldest);
    }
  }

  async listDescriptionVersions(issueId: string): Promise<IssueDescriptionVersion[]> {
    return IssueDescriptionVersion.find({ where: { issueId }, order: { createdAt: "DESC" } });
  }

  async restoreDescriptionVersion(issue: Issue, versionId: string): Promise<Issue> {
    const version = await IssueDescriptionVersion.findOne({ where: { id: versionId, issueId: issue.id } });
    if (!version) {
      throw new ApiError(404, "issue_description_version_not_found", "Versão não encontrada.");
    }
    issue.descriptionJson = version.descriptionJson;
    issue.descriptionHtml = version.descriptionHtml;
    await issue.save();
    return issue;
  }
}

export const issueVersionService = new IssueVersionService();
