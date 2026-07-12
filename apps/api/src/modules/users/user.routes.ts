import { Router } from "express";
import { userController } from "./user.controller.js";
import { requireAuth } from "../../middleware/require-auth.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";

export const userRouter = Router();

userRouter.use(requireAuth);
userRouter.get("/me", asyncHandler(userController.me));
userRouter.patch("/me", asyncHandler(userController.updateMe));
