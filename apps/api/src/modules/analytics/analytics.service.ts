import { AppDataSource } from "../../config/data-source.js";
import { Issue } from "../../entities/issue.entity.js";
import { Project } from "../../entities/project.entity.js";
import { AnalyticView } from "../../entities/analytic-view.entity.js";
import { Workspace } from "../../entities/workspace.entity.js";
import { ApiError } from "../../common/api-error.js";
import { axisSql, type SegmentAxis, type XAxis, type YAxis } from "./analytics-axis.js";

class AnalyticsService {
  /**
   * `projectIds === undefined` → sem filtro (todos os projetos do
   * workspace); `projectIds === []` → zera o resultado explicitamente.
   * As duas semânticas não podem ser normalizadas juntas (distinção
   * proposital do domínio original, fácil de perder).
   */
  async adhoc(
    workspaceId: string,
    input: { xAxis: XAxis; yAxis: YAxis; segment?: SegmentAxis; projectIds?: string[] },
  ) {
    const x = axisSql(input.xAxis, "x_value");
    const segment = input.segment ? axisSql(input.segment, "segment_value") : null;
    const yExpr = input.yAxis === "estimate" ? `COALESCE(SUM(i.point), 0)` : `COUNT(DISTINCT i.id)`;
    const joins = [x.join, segment?.join].filter(Boolean).join(" ");
    const selectSegment = segment ? `, ${segment.select}` : "";

    if (input.projectIds?.length === 0) return [];

    const projectClause = input.projectIds ? `AND i."projectId" = ANY($2)` : "";
    const queryParams: unknown[] = [workspaceId];
    if (input.projectIds) queryParams.push(input.projectIds);

    const sql = `
      SELECT ${x.select}${selectSegment}, ${yExpr} AS value
      FROM issues i
      ${joins}
      WHERE i."workspaceId" = $1 AND i."deletedAt" IS NULL ${projectClause}
      GROUP BY x_value${segment ? ", segment_value" : ""}
      ORDER BY value DESC
      LIMIT 200
    `;

    return AppDataSource.query(sql, queryParams);
  }

  async defaultDashboard(workspaceId: string) {
    const totalIssues = await Issue.count({ where: { workspaceId } });

    const byStateGroup = await Issue.getRepository()
      .createQueryBuilder("i")
      .leftJoin("states", "s", "s.id = i.stateId")
      .select("s.group", "group")
      .addSelect("COUNT(*)", "count")
      .where("i.workspaceId = :workspaceId", { workspaceId })
      .groupBy("s.group")
      .getRawMany<{ group: string | null; count: string }>();

    const currentYear = new Date().getFullYear();
    const completedByMonth = await Issue.getRepository()
      .createQueryBuilder("i")
      .select(`to_char(date_trunc('month', i."completedAt"), 'YYYY-MM')`, "month")
      .addSelect("COUNT(*)", "count")
      .where("i.workspaceId = :workspaceId", { workspaceId })
      .andWhere("i.completedAt IS NOT NULL")
      .andWhere(`EXTRACT(YEAR FROM i."completedAt") = :year`, { year: currentYear })
      .groupBy("month")
      .orderBy("month", "ASC")
      .getRawMany<{ month: string; count: string }>();

    const topAssignees = await Issue.getRepository()
      .createQueryBuilder("i")
      .innerJoin("issue_assignees", "ia", `ia."issueId" = i.id AND ia."deletedAt" IS NULL`)
      .select("ia.assigneeId", "assigneeId")
      .addSelect("COUNT(*)", "count")
      .where("i.workspaceId = :workspaceId", { workspaceId })
      .andWhere("i.deletedAt IS NULL")
      .groupBy("ia.assigneeId")
      .orderBy("count", "DESC")
      .limit(5)
      .getRawMany<{ assigneeId: string; count: string }>();

    const openEstimateSum = await Issue.getRepository()
      .createQueryBuilder("i")
      .leftJoin("states", "s", "s.id = i.stateId")
      .select("COALESCE(SUM(i.point), 0)", "sum")
      .where("i.workspaceId = :workspaceId", { workspaceId })
      .andWhere("i.deletedAt IS NULL")
      .andWhere("s.group NOT IN ('completed', 'cancelled')")
      .getRawOne<{ sum: string }>();

    return {
      totalIssues,
      byStateGroup: byStateGroup.map((r) => ({ group: r.group, count: Number(r.count) })),
      completedByMonth: completedByMonth.map((r) => ({ month: r.month, count: Number(r.count) })),
      topAssignees: topAssignees.map((r) => ({ assigneeId: r.assigneeId, count: Number(r.count) })),
      openEstimateSum: Number(openEstimateSum?.sum ?? 0),
    };
  }

  async projectStats(workspaceId: string) {
    const projects = await Project.find({ where: { workspaceId } });
    const stats = [];
    for (const project of projects) {
      const [totalIssues, completedIssues, totalMembers, totalCycles, totalModules] = await Promise.all([
        Issue.count({ where: { projectId: project.id } }),
        Issue.getRepository()
          .createQueryBuilder("i")
          .leftJoin("states", "s", "s.id = i.stateId")
          .where("i.projectId = :projectId", { projectId: project.id })
          .andWhere("s.group = 'completed'")
          .getCount(),
        AppDataSource.query(
          `SELECT COUNT(*) FROM project_members WHERE "projectId" = $1 AND "isActive" = true AND "deletedAt" IS NULL`,
          [project.id],
        ).then((r) => Number(r[0]?.count ?? 0)),
        AppDataSource.query(`SELECT COUNT(*) FROM cycles WHERE "projectId" = $1 AND "deletedAt" IS NULL`, [
          project.id,
        ]).then((r) => Number(r[0]?.count ?? 0)),
        AppDataSource.query(`SELECT COUNT(*) FROM modules WHERE "projectId" = $1 AND "deletedAt" IS NULL`, [
          project.id,
        ]).then((r) => Number(r[0]?.count ?? 0)),
      ]);
      stats.push({
        projectId: project.id,
        name: project.name,
        totalIssues,
        completedIssues,
        totalMembers,
        totalCycles,
        totalModules,
      });
    }
    return stats;
  }

  // ---- Dashboards salvos ----

  async listViews(workspaceId: string) {
    return AnalyticView.find({ where: { workspaceId }, order: { createdAt: "DESC" } });
  }

  async findViewOrThrow(workspaceId: string, viewId: string): Promise<AnalyticView> {
    const view = await AnalyticView.findOne({ where: { id: viewId, workspaceId } });
    if (!view) {
      throw new ApiError(404, "analytic_view_not_found", "Dashboard salvo não encontrado.");
    }
    return view;
  }

  async createView(workspace: Workspace, input: { name: string; description?: string | null; query: Record<string, unknown> }) {
    const view = AnalyticView.create({
      workspaceId: workspace.id,
      name: input.name,
      description: input.description ?? null,
      query: input.query,
    });
    await view.save();
    return view;
  }

  async updateView(view: AnalyticView, input: { name?: string; description?: string | null; query?: Record<string, unknown> }) {
    Object.assign(view, input);
    await view.save();
    return view;
  }

  async removeView(view: AnalyticView) {
    await view.softRemove();
  }

  async runSavedView(view: AnalyticView) {
    const query = view.query as { xAxis: XAxis; yAxis: YAxis; segment?: SegmentAxis; projectIds?: string[] };
    return this.adhoc(view.workspaceId, query);
  }
}

export const analyticsService = new AnalyticsService();
