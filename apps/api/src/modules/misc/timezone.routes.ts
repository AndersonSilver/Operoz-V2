import { Router } from "express";
import { asyncHandler } from "../../common/async-handler.js";

export const timezoneRouter = Router();

/**
 * Lista canônica de fusos IANA — gerada em runtime via `Intl`, sem
 * manter uma lista estática que ficaria desatualizada a cada versão do
 * tzdata.
 */
timezoneRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const timezones = Intl.supportedValuesOf("timeZone");
    res.json({ timezones });
  }),
);
