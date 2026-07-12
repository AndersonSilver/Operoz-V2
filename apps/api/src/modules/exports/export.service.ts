import { randomUUID } from "node:crypto";
import { ExporterHistory, type ExportProvider } from "../../entities/exporter-history.entity.js";
import { Issue } from "../../entities/issue.entity.js";
import { IssueActivity } from "../../entities/issue-activity.entity.js";
import { ProjectMember } from "../../entities/project-member.entity.js";
import { Workspace } from "../../entities/workspace.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { logger } from "../../common/logger.js";
import { toCsv } from "./csv.js";
import { writeExportFile, readExportFile, deleteExportFile } from "./export-storage.js";

const EXPORT_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;

class ExportService {
  async listHistory(workspaceId: string) {
    return ExporterHistory.find({ where: { workspaceId }, order: { createdAt: "DESC" } });
  }

  async findOrThrow(workspaceId: string, historyId: string): Promise<ExporterHistory> {
    const history = await ExporterHistory.findOne({ where: { id: historyId, workspaceId } });
    if (!history) {
      throw new ApiError(404, "export_not_found", "Export não encontrado.");
    }
    return history;
  }

  /** Retorna imediatamente com status "queued" — o processamento roda fire-and-forget. */
  async createIssueExport(
    workspace: Workspace,
    actor: User,
    input: { projectIds: string[]; provider: ExportProvider; name?: string },
  ): Promise<ExporterHistory> {
    // Regra de segurança crítica: só exporta projetos onde o solicitante
    // ainda é membro ativo — sem isso, alguém que perdeu acesso a um
    // projeto continuaria conseguindo exportar os dados dele.
    const activeMemberships = await ProjectMember.find({
      where: { userId: actor.id, isActive: true },
    });
    const allowedProjectIds = new Set(activeMemberships.map((m) => m.projectId));
    const safeProjectIds = input.projectIds.filter((id) => allowedProjectIds.has(id));

    if (safeProjectIds.length === 0) {
      throw new ApiError(422, "no_exportable_projects", "Nenhum dos projetos informados é acessível para exportação.");
    }

    const history = ExporterHistory.create({
      workspaceId: workspace.id,
      name: input.name ?? null,
      projectIds: safeProjectIds,
      provider: input.provider,
      status: "queued",
      token: randomUUID(),
      initiatedById: actor.id,
    });
    await history.save();

    void this.runIssueExportJob(history.id, workspace.slug);

    return history;
  }

  private async runIssueExportJob(historyId: string, workspaceSlug: string): Promise<void> {
    const history = await ExporterHistory.findOneBy({ id: historyId });
    if (!history) return;

    try {
      history.status = "processing";
      await history.save();

      const issues = await Issue.getRepository()
        .createQueryBuilder("i")
        .where("i.projectId IN (:...projectIds)", { projectIds: history.projectIds })
        .andWhere("i.deletedAt IS NULL")
        .getMany();

      const rows = issues.map((issue) => ({
        id: issue.id,
        sequenceId: issue.sequenceId,
        projectId: issue.projectId,
        name: issue.name,
        priority: issue.priority,
        stateId: issue.stateId,
        point: issue.point,
        startDate: issue.startDate,
        targetDate: issue.targetDate,
        completedAt: issue.completedAt,
        archivedAt: issue.archivedAt,
        createdAt: issue.createdAt,
      }));

      const columns = [
        "id",
        "sequenceId",
        "projectId",
        "name",
        "priority",
        "stateId",
        "point",
        "startDate",
        "targetDate",
        "completedAt",
        "archivedAt",
        "createdAt",
      ];

      const fileName = `export-${workspaceSlug}-${history.token.slice(0, 6)}-${Date.now()}.${history.provider}`;
      const content = history.provider === "csv" ? toCsv(rows, columns) : JSON.stringify(rows, null, 2);
      const filePath = await writeExportFile(fileName, content);

      history.key = filePath;
      history.status = "completed";
      await history.save();
    } catch (err) {
      logger.error({ err, historyId }, "Falha ao processar export de issues");
      history.status = "failed";
      history.reason = err instanceof Error ? err.message : "Erro desconhecido";
      await history.save();
    }
  }

  async downloadFile(history: ExporterHistory): Promise<Buffer> {
    if (history.status !== "completed" || !history.key) {
      throw new ApiError(422, "export_not_ready", "Este export ainda não está pronto para download.");
    }
    return readExportFile(history.key);
  }

  /** Síncrono — gera e retorna o CSV direto, sem passar por ExporterHistory. */
  async exportUserActivityCsv(workspaceId: string, targetUserId: string): Promise<string> {
    const activities = await IssueActivity.find({
      where: { workspaceId, actorId: targetUserId },
      order: { createdAt: "DESC" },
      take: 5000,
    });
    const rows = activities.map((a) => ({
      id: a.id,
      issueId: a.issueId,
      verb: a.verb,
      field: a.field,
      oldValue: a.oldValue,
      newValue: a.newValue,
      createdAt: a.createdAt,
    }));
    return toCsv(rows, ["id", "issueId", "verb", "field", "oldValue", "newValue", "createdAt"]);
  }

  /** Job diário: apaga do disco (e desvincula) exports com mais de 8 dias — mantém o registro histórico. */
  async cleanupExpiredExports(): Promise<number> {
    const cutoff = new Date(Date.now() - EXPORT_MAX_AGE_MS);
    const expired = await ExporterHistory.getRepository()
      .createQueryBuilder("e")
      .where("e.createdAt < :cutoff", { cutoff })
      .andWhere("e.key IS NOT NULL")
      .getMany();

    for (const history of expired) {
      if (history.key) await deleteExportFile(history.key);
      history.key = null;
      await history.save();
    }
    return expired.length;
  }
}

export const exportService = new ExportService();
