import type { EntityManager } from "typeorm";
import { Notification } from "../../entities/notification.entity.js";
import { UserNotificationPreference } from "../../entities/user-notification-preference.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";

export type NotificationPreferenceKey =
  | "propertyChange"
  | "stateChange"
  | "comment"
  | "mention"
  | "issueCompleted";

const DEFAULT_PREFS: Pick<
  UserNotificationPreference,
  "propertyChange" | "stateChange" | "comment" | "mention" | "issueCompleted" | "channels"
> = {
  propertyChange: true,
  stateChange: true,
  comment: true,
  mention: true,
  issueCompleted: true,
  channels: { email: { enabled: true, frequency: "immediate" }, in_app: { enabled: true } },
};

interface CreateNotificationInput {
  workspaceId: string;
  projectId: string | null;
  entityType: string;
  entityIdentifier: string | null;
  title: string;
  messageHtml?: string;
  data?: Record<string, unknown>;
  sender: string;
  triggeredById: string | null;
  receiverIds: string[];
  preferenceKey: NotificationPreferenceKey;
}

class NotificationService {
  /** Upsert — corrige o `.get()` estrito do original, que podia 404 se a preferência nunca tivesse sido criada. */
  async getOrCreatePreference(userId: string): Promise<UserNotificationPreference> {
    let pref = await UserNotificationPreference.findOne({ where: { userId } });
    if (!pref) {
      pref = UserNotificationPreference.create({ userId, ...DEFAULT_PREFS });
      await pref.save();
    }
    return pref;
  }

  async createDefaultPreference(manager: EntityManager, userId: string): Promise<void> {
    const existing = await manager.findOne(UserNotificationPreference, { where: { userId } });
    if (existing) return;
    await manager.save(manager.create(UserNotificationPreference, { userId, ...DEFAULT_PREFS }));
  }

  async updatePreference(userId: string, patch: Partial<UserNotificationPreference>) {
    const pref = await this.getOrCreatePreference(userId);
    Object.assign(pref, patch);
    await pref.save();
    return pref;
  }

  /** Cria uma notificação para cada destinatário elegível — nunca notifica o autor da própria ação nem bots. */
  async notify(manager: EntityManager, input: CreateNotificationInput): Promise<void> {
    const uniqueReceiverIds = [...new Set(input.receiverIds)].filter((id) => id !== input.triggeredById);
    if (uniqueReceiverIds.length === 0) return;

    const eligibleUsers = await manager
      .createQueryBuilder(User, "u")
      .where("u.id IN (:...ids)", { ids: uniqueReceiverIds })
      .andWhere("u.isBot = false")
      .andWhere("u.isActive = true")
      .getMany();

    for (const user of eligibleUsers) {
      const pref = await this.getOrCreatePreference(user.id);
      if (!pref[input.preferenceKey]) continue;
      const inAppChannel = pref.channels?.["in_app"] as { enabled?: boolean } | undefined;
      if (inAppChannel && inAppChannel.enabled === false) continue;

      const notification = manager.create(Notification, {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        entityType: input.entityType,
        entityIdentifier: input.entityIdentifier,
        title: input.title,
        messageHtml: input.messageHtml ?? "<p></p>",
        data: input.data ?? {},
        sender: input.sender,
        triggeredById: input.triggeredById,
        receiverId: user.id,
      });
      await manager.save(notification);
    }
  }

  async list(
    receiverId: string,
    workspaceId: string,
    filters: { read?: boolean; snoozed?: boolean; archived?: boolean; entityType?: string },
  ) {
    const qb = Notification.getRepository()
      .createQueryBuilder("n")
      .where("n.receiverId = :receiverId", { receiverId })
      .andWhere("n.workspaceId = :workspaceId", { workspaceId });

    if (filters.snoozed) {
      qb.andWhere("n.snoozedTill IS NOT NULL AND n.snoozedTill > now()");
    } else if (filters.archived) {
      qb.andWhere("n.archivedAt IS NOT NULL");
    } else {
      qb.andWhere("n.archivedAt IS NULL");
      qb.andWhere("(n.snoozedTill IS NULL OR n.snoozedTill <= now())");
    }

    if (filters.read !== undefined) {
      qb.andWhere(filters.read ? "n.readAt IS NOT NULL" : "n.readAt IS NULL");
    }
    if (filters.entityType) {
      qb.andWhere("n.entityType = :entityType", { entityType: filters.entityType });
    }

    return qb.orderBy("n.createdAt", "DESC").limit(100).getMany();
  }

  async findOrThrow(receiverId: string, notificationId: string): Promise<Notification> {
    const notification = await Notification.findOne({ where: { id: notificationId, receiverId } });
    if (!notification) {
      throw new ApiError(404, "notification_not_found", "Notificação não encontrada.");
    }
    return notification;
  }

  async markRead(notification: Notification) {
    notification.readAt = new Date();
    await notification.save();
    return notification;
  }

  async markUnread(notification: Notification) {
    notification.readAt = null;
    await notification.save();
    return notification;
  }

  async archive(notification: Notification) {
    notification.archivedAt = new Date();
    await notification.save();
    return notification;
  }

  async unarchive(notification: Notification) {
    notification.archivedAt = null;
    await notification.save();
    return notification;
  }

  async snooze(notification: Notification, snoozedTill: Date | null) {
    notification.snoozedTill = snoozedTill;
    await notification.save();
    return notification;
  }

  /** Marca como lidas todas as notificações que batem com os filtros ativos (não literalmente "todas" do usuário). */
  async markAllRead(receiverId: string, workspaceId: string, filters: { entityType?: string }) {
    const qb = Notification.getRepository()
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where("receiverId = :receiverId", { receiverId })
      .andWhere("workspaceId = :workspaceId", { workspaceId })
      .andWhere("readAt IS NULL");
    if (filters.entityType) {
      qb.andWhere("entityType = :entityType", { entityType: filters.entityType });
    }
    await qb.execute();
  }

  async getUnreadCounts(receiverId: string, workspaceId: string) {
    const totalUnread = await Notification.getRepository()
      .createQueryBuilder("n")
      .where("n.receiverId = :receiverId", { receiverId })
      .andWhere("n.workspaceId = :workspaceId", { workspaceId })
      .andWhere("n.readAt IS NULL")
      .andWhere("n.archivedAt IS NULL")
      .getCount();
    const mentionUnread = await Notification.getRepository()
      .createQueryBuilder("n")
      .where("n.receiverId = :receiverId", { receiverId })
      .andWhere("n.workspaceId = :workspaceId", { workspaceId })
      .andWhere("n.readAt IS NULL")
      .andWhere("n.archivedAt IS NULL")
      .andWhere("n.entityType = :entityType", { entityType: "mention" })
      .getCount();
    return { totalUnreadNotificationsCount: totalUnread, mentionUnreadNotificationsCount: mentionUnread };
  }
}

export const notificationService = new NotificationService();
