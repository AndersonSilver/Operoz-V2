import { Router } from "express";
import { userController } from "./user.controller.js";
import { requireAuth } from "../../middleware/require-auth.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import { workspaceInviteController } from "../workspaces/workspace.controller.js";

export const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get("/me", asyncHandler(userController.me));
userRouter.patch("/me", asyncHandler(userController.updateMe));
userRouter.get("/me/workspace-invitations", asyncHandler(workspaceInviteController.listMine));
userRouter.post("/me/workspace-invitations/accept", asyncHandler(workspaceInviteController.acceptMine));
