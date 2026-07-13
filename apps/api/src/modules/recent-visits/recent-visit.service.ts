import { AppDataSource } from "../../config/data-source.js";
import { UserRecentVisit, type RecentVisitEntityType } from "../../entities/user-recent-visit.entity.js";

const MAX_RECENT_VISITS = 20;

class RecentVisitService {
  /**
   * Upsert atômico (ON CONFLICT) seguido de poda mantendo só as 20 mais
   * recentes por usuário+workspace — LRU manual, mesma abordagem do
   * original (sem TTL nativo do banco).
   */
  async record(workspaceId: string, userId: string, entityType: RecentVisitEntityType, entityId: string): Promise<void> {
    await AppDataSource.query(
      `
      INSERT INTO user_recent_visits ("workspaceId", "userId", "entityType", "entityId", "visitedAt")
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT ("workspaceId", "userId", "entityType", "entityId")
      DO UPDATE SET "visitedAt" = now(), "updatedAt" = now()
      `,
      [workspaceId, userId, entityType, entityId],
    );

    await AppDataSource.query(
      `
      DELETE FROM user_recent_visits
      WHERE "workspaceId" = $1 AND "userId" = $2
        AND id NOT IN (
          SELECT id FROM user_recent_visits
          WHERE "workspaceId" = $1 AND "userId" = $2
          ORDER BY "visitedAt" DESC
          LIMIT $3
        )
      `,
      [workspaceId, userId, MAX_RECENT_VISITS],
    );
  }

  async list(workspaceId: string, userId: string): Promise<UserRecentVisit[]> {
    return UserRecentVisit.find({
      where: { workspaceId, userId },
      order: { visitedAt: "DESC" },
      take: MAX_RECENT_VISITS,
    });
  }
}

export const recentVisitService = new RecentVisitService();
