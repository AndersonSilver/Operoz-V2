import { Not, IsNull } from "typeorm";
import { StatusReport } from "../../entities/status-report.entity.js";
import { ProjectModule } from "../../entities/module.entity.js";
import { Project } from "../../entities/project.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";

class StatusReportService {
  async list(projectId: string): Promise<StatusReport[]> {
    return StatusReport.find({ where: { projectId }, order: { periodEnd: "DESC", createdAt: "DESC" } });
  }

  async findOrThrow(projectId: string, reportId: string): Promise<StatusReport> {
    const report = await StatusReport.findOneBy({ id: reportId, projectId });
    if (!report) throw new ApiError(404, "status_report_not_found", "Relatório de status não encontrado.");
    return report;
  }

  async create(
    project: Project,
    actor: User,
    input: { moduleId?: string | null; title?: string; periodStart: string; periodEnd: string; content?: Record<string, unknown> },
  ): Promise<StatusReport> {
    if (input.periodEnd < input.periodStart) {
      throw new ApiError(422, "invalid_period", "periodEnd não pode ser anterior a periodStart.");
    }
    if (input.moduleId) {
      const mod = await ProjectModule.findOneBy({ id: input.moduleId, projectId: project.id });
      if (!mod) throw new ApiError(404, "module_not_found", "Módulo não encontrado neste projeto.");
    }

    return StatusReport.create({
      workspaceId: project.workspaceId,
      projectId: project.id,
      moduleId: input.moduleId ?? null,
      title: input.title ?? "",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      content: input.content ?? {},
      createdById: actor.id,
    }).save();
  }

  async update(report: StatusReport, input: { title?: string; content?: Record<string, unknown> }): Promise<StatusReport> {
    if (report.publishedAt) {
      throw new ApiError(422, "status_report_already_published", "Relatório já publicado não pode ser editado.");
    }
    if (input.title !== undefined) report.title = input.title;
    if (input.content !== undefined) report.content = input.content;
    return report.save();
  }

  async publish(report: StatusReport): Promise<StatusReport> {
    if (report.publishedAt) return report;
    report.publishedAt = new Date();
    return report.save();
  }

  async remove(report: StatusReport): Promise<void> {
    await report.remove();
  }

  /** Usado pelo motor de Health Score do Client 360. */
  async listPublishedForPeriod(projectId: string, periodStart: string, periodEnd: string): Promise<StatusReport[]> {
    return StatusReport.find({
      where: { projectId, periodStart, periodEnd, publishedAt: Not(IsNull()) },
    });
  }
}

export const statusReportService = new StatusReportService();
