import { z } from "zod";
import { RECENT_VISIT_ENTITY_TYPES } from "../../entities/user-recent-visit.entity.js";

export const recordVisitSchema = z.object({
  entityType: z.enum(RECENT_VISIT_ENTITY_TYPES),
  entityId: z.string().uuid(),
});
