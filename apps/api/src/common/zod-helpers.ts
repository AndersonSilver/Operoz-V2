import { z } from "zod";

/**
 * `z.coerce.boolean()` usa `Boolean(value)` — em querystring, todo valor
 * não-vazio (inclusive a string `"false"`) vira `true`. Isso silenciosamente
 * inverte filtros como `?read=false` (verificado em teste real). Use este
 * helper para qualquer boolean vindo de query string.
 */
export const booleanQueryParam = z
  .enum(["true", "false"])
  .transform((v) => v === "true");
