import { Router } from "express";
import { exportController } from "./export.controller.js";
import { asyncHandler } from "../../common/async-handler.js";

/** Montado em `/workspaces/:slug` (depois de `loadWorkspace`). Qualquer membro autenticado — sem exigência de Admin. */
export const exportRouter = Router();

exportRouter.get("/export-issues", asyncHandler(exportController.listHistory));
exportRouter.post("/export-issues", asyncHandler(exportController.createIssueExport));
exportRouter.get("/export-issues/:exportId/download", asyncHandler(exportController.download));
exportRouter.post("/user-activity/:userId/export", asyncHandler(exportController.exportUserActivity));
