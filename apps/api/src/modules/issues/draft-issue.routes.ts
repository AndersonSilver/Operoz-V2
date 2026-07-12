import { Router } from "express";
import { draftIssueController } from "./draft-issue.controller.js";
import { asyncHandler } from "../../common/async-handler.js";

/** Montado em `/workspaces/:slug/draft-issues` (depois de `loadWorkspace`). Sempre escopado ao usuário autenticado. */
export const draftIssueRouter = Router();

draftIssueRouter.get("/", asyncHandler(draftIssueController.listMine));
draftIssueRouter.post("/", asyncHandler(draftIssueController.create));
draftIssueRouter.get("/:draftId", asyncHandler(draftIssueController.detail));
draftIssueRouter.patch("/:draftId", asyncHandler(draftIssueController.update));
draftIssueRouter.delete("/:draftId", asyncHandler(draftIssueController.remove));
draftIssueRouter.post("/:draftId/draft-to-issue", asyncHandler(draftIssueController.publish));
