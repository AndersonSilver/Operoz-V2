import { AppDataSource } from "../../config/data-source.js";
import { Issue } from "../../entities/issue.entity.js";
import { logIssueActivity } from "./issue-activity.service.js";

/**
 * Job diário de arquivamento por inatividade (equivalente ao original,
 * pensado para rodar via cron externo — `tsx src/scripts/archive-issues.ts`).
 * Idempotente: só afeta issues com `archivedAt IS NULL`.
 *
 * Interpretação assumida para `closeIn` (documentada como ambígua na
 * pesquisa da fonte original): ambos os campos resultam em `archivedAt`
 * setado, apenas com grupos de state e limiares de inatividade
 * diferentes — "close" aqui é tratado como sinônimo de "arquivar por
 * inatividade", não como uma transição de state.
 */
export async function runArchiveAndCloseJob(): Promise<{ archived: number; closed: number }> {
  let archived = 0;
  let closed = 0;

  await AppDataSource.transaction(async (manager) => {
    const archiveRows = await manager.query<Array<{ id: string; projectId: string; workspaceId: string }>>(`
      SELECT i.id, i."projectId", i."workspaceId"
      FROM issues i
      INNER JOIN projects p ON p.id = i."projectId"
      INNER JOIN states s ON s.id = i."stateId"
      WHERE i."archivedAt" IS NULL
        AND i."deletedAt" IS NULL
        AND p."archiveIn" > 0
        AND s.group IN ('completed', 'cancelled')
        AND i."updatedAt" < now() - (p."archiveIn" || ' months')::interval
    `);
    for (const row of archiveRows) {
      await manager.update(Issue, { id: row.id }, { archivedAt: new Date() });
      await logIssueActivity(manager, {
        issueId: row.id,
        projectId: row.projectId,
        workspaceId: row.workspaceId,
        actorId: null,
        verb: "archived",
        field: "archivedAt",
      });
      archived += 1;
    }

    const closeRows = await manager.query<Array<{ id: string; projectId: string; workspaceId: string }>>(`
      SELECT i.id, i."projectId", i."workspaceId"
      FROM issues i
      INNER JOIN projects p ON p.id = i."projectId"
      INNER JOIN states s ON s.id = i."stateId"
      WHERE i."archivedAt" IS NULL
        AND i."deletedAt" IS NULL
        AND p."closeIn" > 0
        AND s.group IN ('backlog', 'unstarted', 'started')
        AND i."updatedAt" < now() - (p."closeIn" || ' months')::interval
    `);
    for (const row of closeRows) {
      await manager.update(Issue, { id: row.id }, { archivedAt: new Date() });
      await logIssueActivity(manager, {
        issueId: row.id,
        projectId: row.projectId,
        workspaceId: row.workspaceId,
        actorId: null,
        verb: "archived",
        field: "archivedAt",
      });
      closed += 1;
    }
  });

  return { archived, closed };
}
