import { BoardClient360HealthSettings } from "../../entities/board-client-360-health-settings.entity.js";
import { ApiError } from "../../common/api-error.js";

class HealthSettingsService {
  async getOrCreate(boardId: string): Promise<BoardClient360HealthSettings> {
    const existing = await BoardClient360HealthSettings.findOneBy({ boardId });
    if (existing) return existing;
    return BoardClient360HealthSettings.create({ boardId }).save();
  }

  async update(
    boardId: string,
    input: Partial<
      Pick<
        BoardClient360HealthSettings,
        | "weightReport"
        | "weightOverdue"
        | "weightSupport"
        | "thresholdOkMin"
        | "thresholdWarningMin"
        | "scoreAlertThreshold"
        | "supportSlaDays"
      >
    >,
  ): Promise<BoardClient360HealthSettings> {
    const settings = await this.getOrCreate(boardId);

    const weightReport = input.weightReport ?? settings.weightReport;
    const weightOverdue = input.weightOverdue ?? settings.weightOverdue;
    const weightSupport = input.weightSupport ?? settings.weightSupport;
    if (weightReport + weightOverdue + weightSupport !== 100) {
      throw new ApiError(422, "weights_must_sum_100", "weightReport + weightOverdue + weightSupport devem somar 100.");
    }

    Object.assign(settings, input);
    return settings.save();
  }
}

export const healthSettingsService = new HealthSettingsService();
