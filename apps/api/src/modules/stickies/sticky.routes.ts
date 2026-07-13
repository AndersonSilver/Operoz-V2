import { Router } from "express";
import { stickyController } from "./sticky.controller.js";
import { asyncHandler } from "../../common/async-handler.js";

/** Montado em `/workspaces/:slug/stickies` (depois de `loadWorkspace`). */
export const stickyRouter = Router();

stickyRouter.get("/", asyncHandler(stickyController.list));
stickyRouter.post("/", asyncHandler(stickyController.create));
stickyRouter.patch("/:stickyId", asyncHandler(stickyController.update));
stickyRouter.delete("/:stickyId", asyncHandler(stickyController.remove));
