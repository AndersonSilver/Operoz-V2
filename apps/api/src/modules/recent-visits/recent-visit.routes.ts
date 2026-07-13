import { Router } from "express";
import { recentVisitController } from "./recent-visit.controller.js";
import { asyncHandler } from "../../common/async-handler.js";

/** Montado em `/workspaces/:slug/recent-visits` (depois de `loadWorkspace`). */
export const recentVisitRouter = Router();

recentVisitRouter.get("/", asyncHandler(recentVisitController.list));
recentVisitRouter.post("/", asyncHandler(recentVisitController.record));
