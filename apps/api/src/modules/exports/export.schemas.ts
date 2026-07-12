import { z } from "zod";

export const createIssueExportSchema = z.object({
  projectIds: z.array(z.string().uuid()).min(1).max(50),
  provider: z.enum(["csv", "json"]),
  name: z.string().max(255).optional(),
});
