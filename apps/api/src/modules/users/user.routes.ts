import { Router } from "express";
import { userController } from "./user.controller.js";
import { requireAuth } from "../../middleware/require-auth.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { workspaceInviteController } from "../workspaces/workspace.controller.js";
import { projectInviteController } from "../projects/project.controller.js";
import { notificationController } from "../notifications/notification.controller.js";
import { apiTokenRouter } from "../api-tokens/api-token.routes.js";

export const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get("/me", asyncHandler(userController.me));
userRouter.patch("/me", asyncHandler(userController.updateMe));
userRouter.get("/me/workspace-invitations", asyncHandler(workspaceInviteController.listMine));
userRouter.post("/me/workspace-invitations/accept", asyncHandler(workspaceInviteController.acceptMine));
userRouter.get("/me/project-invitations", asyncHandler(projectInviteController.listMine));
userRouter.post("/me/project-invitations/accept", asyncHandler(projectInviteController.acceptMine));
userRouter.get("/me/notification-preferences", asyncHandler(notificationController.getPreference));
userRouter.patch("/me/notification-preferences", asyncHandler(notificationController.updatePreference));
userRouter.use("/me/api-tokens", apiTokenRouter);
