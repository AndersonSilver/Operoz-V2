import { Router } from "express";
import { pageController } from "./page.controller.js";
import { loadPage } from "./page.middleware.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { WorkspaceRole } from "../../common/roles.js";

/** Montado em `/workspaces/:slug/projects/:projectId/pages` (depois de `loadProject`). */
export const pageRouter = Router();

pageRouter.get("/", asyncHandler(pageController.list));
pageRouter.post("/", requireProjectRole(WorkspaceRole.MEMBER), asyncHandler(pageController.create));
pageRouter.get("/summary", asyncHandler(pageController.summary));

pageRouter.get("/:pageId", loadPage, asyncHandler(pageController.detail));
pageRouter.patch("/:pageId", loadPage, asyncHandler(pageController.update));
pageRouter.post("/:pageId/access", loadPage, asyncHandler(pageController.changeAccess));
pageRouter.delete("/:pageId", loadPage, asyncHandler(pageController.remove));
pageRouter.post("/:pageId/archive", loadPage, asyncHandler(pageController.archive));
pageRouter.delete("/:pageId/archive", loadPage, asyncHandler(pageController.unarchive));
pageRouter.post("/:pageId/lock", loadPage, asyncHandler(pageController.lock));
pageRouter.delete("/:pageId/lock", loadPage, asyncHandler(pageController.unlock));
pageRouter.patch("/:pageId/description", loadPage, asyncHandler(pageController.updateDescription));
pageRouter.post("/:pageId/duplicate", loadPage, asyncHandler(pageController.duplicate));
pageRouter.get("/:pageId/versions", loadPage, asyncHandler(pageController.listVersions));
pageRouter.post("/:pageId/versions/:versionId/restore", loadPage, asyncHandler(pageController.restoreVersion));
