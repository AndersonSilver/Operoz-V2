import { z } from "zod";
import { SEARCH_TYPES } from "./search.service.js";

export const searchQuerySchema = z.object({
  query: z.string().min(1).max(255),
  types: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter((t): t is (typeof SEARCH_TYPES)[number] => SEARCH_TYPES.includes(t as never)) : undefined)),
});
