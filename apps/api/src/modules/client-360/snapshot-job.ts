import { IsNull } from "typeorm";
import { Board } from "../../entities/board.entity.js";
import { BoardProject } from "../../entities/board-project.entity.js";
import { Project } from "../../entities/project.entity.js";
import { Client360HealthSnapshot } from "../../entities/client-360-health-snapshot.entity.js";
import { client360Service } from "./client-360.service.js";
import { previousWeekPeriod } from "./period.js";

/**
 * Roda semanalmente (ver `jobs/schedule.ts`): calcula o health score da
 * semana que acabou de fechar para cada projeto de cada board ativo e
 * grava/atualiza o snapshot histórico. Idempotente — upsert por
 * (projectId, periodStart).
 */
export async function runClient360SnapshotJob(): Promise<{ snapshots: number }> {
  const period = previousWeekPeriod();
  const boards = await Board.find({ where: { archivedAt: IsNull() } });

  let count = 0;
  for (const board of boards) {
    const links = await BoardProject.find({ where: { boardId: board.id } });
    for (const link of links) {
      const project = await Project.findOneBy({ id: link.projectId });
      if (!project) continue;

      const health = await client360Service.computeForProject(project, board, period);

      const existing = await Client360HealthSnapshot.findOneBy({ projectId: project.id, periodStart: period.start });
      if (existing) {
        existing.healthScore = health.score;
        existing.health = health.health;
        existing.periodEnd = period.end;
        await existing.save();
      } else {
        await Client360HealthSnapshot.create({
          workspaceId: project.workspaceId,
          projectId: project.id,
          periodStart: period.start,
          periodEnd: period.end,
          healthScore: health.score,
          health: health.health,
        }).save();
      }
      count += 1;
    }
  }

  return { snapshots: count };
}
