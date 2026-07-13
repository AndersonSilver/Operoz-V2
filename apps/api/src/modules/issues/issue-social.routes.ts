import { Router } from "express";
import { loadIssue } from "./issue.middleware.js";
import {
  attachmentController,
  commentController,
  issueActivityController,
  issueReactionController,
  linkController,
  relationController,
  subIssueController,
  subscriberController,
} from "./issue-social.controller.js";
import { issueModulesController } from "../modules/module.controller.js";
import { issueVersionController } from "./issue-version.controller.js";
import { issueCustomFieldValueController } from "../custom-fields/issue-custom-field-value.controller.js";
import { asyncHandler } from "../../common/async-handler.js";

/** Montado em `/workspaces/:slug/projects/:projectId/issues/:issueId` (mergeParams para herdar `:issueId`). */
export const issueSocialRouter = Router({ mergeParams: true });

issueSocialRouter.use(loadIssue);

issueSocialRouter.get("/comments", asyncHandler(commentController.list));
issueSocialRouter.post("/comments", asyncHandler(commentController.create));
issueSocialRouter.patch("/comments/:commentId", asyncHandler(commentController.update));
issueSocialRouter.delete("/comments/:commentId", asyncHandler(commentController.remove));
issueSocialRouter.get("/comments/:commentId/reactions", asyncHandler(commentController.listReactions));
issueSocialRouter.post("/comments/:commentId/reactions", asyncHandler(commentController.addReaction));
issueSocialRouter.delete(
  "/comments/:commentId/reactions/:reactionId",
  asyncHandler(commentController.removeReaction),
);

issueSocialRouter.get("/attachments", asyncHandler(attachmentController.list));
issueSocialRouter.post("/attachments", asyncHandler(attachmentController.create));
issueSocialRouter.delete("/attachments/:attachmentId", asyncHandler(attachmentController.remove));

issueSocialRouter.get("/links", asyncHandler(linkController.list));
issueSocialRouter.post("/links", asyncHandler(linkController.create));
issueSocialRouter.patch("/links/:linkId", asyncHandler(linkController.update));
issueSocialRouter.delete("/links/:linkId", asyncHandler(linkController.remove));

issueSocialRouter.get("/reactions", asyncHandler(issueReactionController.list));
issueSocialRouter.post("/reactions", asyncHandler(issueReactionController.add));
issueSocialRouter.delete("/reactions/:reactionId", asyncHandler(issueReactionController.remove));

issueSocialRouter.get("/subscribers", asyncHandler(subscriberController.list));
issueSocialRouter.post("/subscribe", asyncHandler(subscriberController.subscribe));
issueSocialRouter.post("/unsubscribe", asyncHandler(subscriberController.unsubscribe));

issueSocialRouter.get("/relations", asyncHandler(relationController.list));
issueSocialRouter.post("/relations", asyncHandler(relationController.create));
issueSocialRouter.delete("/relations/:relationId", asyncHandler(relationController.remove));

issueSocialRouter.get("/sub-issues", asyncHandler(subIssueController.list));
issueSocialRouter.post("/sub-issues", asyncHandler(subIssueController.bulkAssign));

issueSocialRouter.get("/activities", asyncHandler(issueActivityController.timeline));

issueSocialRouter.post("/modules", asyncHandler(issueModulesController.set));

issueSocialRouter.get("/versions", asyncHandler(issueVersionController.listVersions));
issueSocialRouter.get("/description-versions", asyncHandler(issueVersionController.listDescriptionVersions));
issueSocialRouter.post(
  "/description-versions/:versionId/restore",
  asyncHandler(issueVersionController.restoreDescriptionVersion),
);

issueSocialRouter.get("/custom-fields", asyncHandler(issueCustomFieldValueController.list));
issueSocialRouter.put("/custom-fields", asyncHandler(issueCustomFieldValueController.set));
