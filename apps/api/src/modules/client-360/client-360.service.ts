import { IsNull } from "typeorm";
import { Board } from "../../entities/board.entity.js";
import { BoardProject } from "../../entities/board-project.entity.js";
import { Project } from "../../entities/project.entity.js";
import { ProjectModule } from "../../entities/module.entity.js";
import { Issue } from "../../entities/issue.entity.js";
import { State } from "../../entities/state.entity.js";
import { Client360HealthSnapshot } from "../../entities/client-360-health-snapshot.entity.js";
import { ApiError } from "../../common/api-error.js";
import { AppDataSource } from "../../config/data-source.js";
import { healthSettingsService } from "./health-settings.service.js";
import { statusReportService } from "../status-reports/status-report.service.js";
import { computeHealthScore, computeOverdueScore, computeReportScore, computeSupportScore } from "./health-score.js";
import { currentWeekPeriod, type Period } from "./period.js";

async function countOverdueIssues(projectId: string): Promise<number> {
  const rows = await AppDataSource.query<Array<{ count: string }>>(
    `
    SELECT count(*) AS count
    FROM issues i
    INNER JOIN states s ON s.id = i."stateId"
    WHERE i."projectId" = $1 AND i."deletedAt" IS NULL AND i."archivedAt" IS NULL
      AND i."targetDate" IS NOT NULL AND i."targetDate" < now()
      AND s.group NOT IN ('completed', 'cancelled')
    `,
    [projectId],
  );
  return Number(rows[0]?.count ?? 0);
}

async function listOverdueIssues(projectId: string, limit: number): Promise<Issue[]> {
  return Issue.getRepository()
    .createQueryBuilder("i")
    .innerJoin(State, "s", "s.id = i.stateId")
    .where("i.projectId = :projectId", { projectId })
    .andWhere("i.archivedAt IS NULL")
    .andWhere("i.targetDate IS NOT NULL AND i.targetDate < now()")
    .andWhere("s.group NOT IN (:...groups)", { groups: ["completed", "cancelled"] })
    .orderBy("i.targetDate", "ASC")
    .take(limit)
    .getMany();
}

class Client360Service {
  /**
   * Calcula o health score de um projeto para o período informado (semana
   * atual por padrão). A dimensão "support" é um placeholder — sempre
   * openCount=0 — até o domínio Intake/Support Queue existir (ver
   * `health-score.ts`).
   */
  async computeForProject(project: Project, board: Board, period: Period = currentWeekPeriod()) {
    const settings = await healthSettingsService.getOrCreate(board.id);

    const modules = await ProjectModule.find({ where: { projectId: project.id, archivedAt: IsNull() } });
    const publishedReports = await statusReportService.listPublishedForPeriod(project.id, period.start, period.end);
    const projectLevelPublished = publishedReports.some((r) => r.moduleId === null);
    const publishedModuleIds = new Set(publishedReports.filter((r) => r.moduleId).map((r) => r.moduleId!));
    const report = computeReportScore(modules.length, publishedModuleIds.size, projectLevelPublished);

    const overdueCount = await countOverdueIssues(project.id);
    const overdueScore = computeOverdueScore(overdueCount);

    const supportOpenCount = 0;
    const supportOverdueCount = 0;
    const supportScore = computeSupportScore(supportOpenCount, supportOverdueCount);

    const result = computeHealthScore(settings, {
      reportCoverage: report.coverage,
      reportScore: report.score,
      hasModules: modules.length > 0,
      overdueScore,
      overdueCount,
      supportScore,
      supportOpenCount,
      supportOverdueCount,
    });

    return { ...result, period, overdueCount, moduleCount: modules.length };
  }

  async listForBoard(board: Board, period?: Period) {
    const projects = await Project.getRepository()
      .createQueryBuilder("p")
      .innerJoin(BoardProject, "bp", 'bp."projectId" = p.id')
      .where("bp.boardId = :boardId", { boardId: board.id })
      .orderBy("p.name", "ASC")
      .getMany();

    return Promise.all(
      projects.map(async (project) => ({
        project: { id: project.id, name: project.name, identifier: project.identifier },
        health: await this.computeForProject(project, board, period),
      })),
    );
  }

  async detailForProject(board: Board, projectId: string, period?: Period) {
    const inBoard = await BoardProject.findOneBy({ boardId: board.id, projectId });
    if (!inBoard) throw new ApiError(404, "board_project_not_found", "Projeto não faz parte deste board.");

    const project = await Project.findOneByOrFail({ id: projectId });
    const health = await this.computeForProject(project, board, period);
    const overdueIssues = await listOverdueIssues(projectId, 15);
    const modules = await ProjectModule.find({ where: { projectId, archivedAt: IsNull() } });

    return {
      project: { id: project.id, name: project.name, identifier: project.identifier },
      health,
      modules: modules.map((m) => ({ id: m.id, name: m.name, status: m.status })),
      overdueIssues: overdueIssues.map((i) => ({
        id: i.id,
        name: i.name,
        sequenceId: i.sequenceId,
        targetDate: i.targetDate,
      })),
    };
  }

  async healthHistory(projectId: string, weeks: number) {
    return Client360HealthSnapshot.find({
      where: { projectId },
      order: { periodStart: "DESC" },
      take: weeks,
    });
  }
}

export const client360Service = new Client360Service();
