import { IssueSubscriber } from "../../entities/issue-subscriber.entity.js";

class SubscriberService {
  async list(issueId: string) {
    return IssueSubscriber.find({ where: { issueId } });
  }

  /** Idempotente: usado tanto pelo endpoint de self-subscribe quanto pelos gatilhos de auto-subscribe. */
  async ensureSubscribed(issueId: string, userId: string): Promise<void> {
    const existing = await IssueSubscriber.findOne({ where: { issueId, subscriberId: userId } });
    if (existing) return;
    const row = IssueSubscriber.create({ issueId, subscriberId: userId });
    await row.save();
  }

  async unsubscribe(issueId: string, userId: string): Promise<void> {
    await IssueSubscriber.getRepository().softDelete({ issueId, subscriberId: userId });
  }

  async isSubscribed(issueId: string, userId: string): Promise<boolean> {
    const existing = await IssueSubscriber.findOne({ where: { issueId, subscriberId: userId } });
    return existing !== null;
  }
}

export const subscriberService = new SubscriberService();
