import { Router } from "express";
import { authController } from "./auth.controller.js";
import { requireAuth } from "../../middleware/require-auth.middleware.js";
import { asyncHandler } from "../../common/async-handler.js";
import {
  magicLinkEmailLimiter,
  magicLinkIpLimiter,
  passwordResetIpLimiter,
  signInEmailLimiter,
  signInIpLimiter,
  signUpIpLimiter,
} from "../../middleware/rate-limit.middleware.js";

export const authRouter = Router();

authRouter.post("/sign-up", signUpIpLimiter, asyncHandler(authController.signUp));
authRouter.post(
  "/sign-in",
  signInIpLimiter,
  signInEmailLimiter,
  asyncHandler(authController.signIn),
);
authRouter.post("/sign-out", asyncHandler(authController.signOut));

authRouter.post(
  "/magic-link",
  magicLinkIpLimiter,
  magicLinkEmailLimiter,
  asyncHandler(authController.requestMagicLink),
);
authRouter.post("/magic-link/verify", asyncHandler(authController.verifyMagicLink));

authRouter.post(
  "/forgot-password",
  passwordResetIpLimiter,
  asyncHandler(authController.forgotPassword),
);
authRouter.post("/reset-password", asyncHandler(authController.resetPassword));
authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(authController.changePassword),
);

authRouter.get("/oauth/:provider/start", asyncHandler(authController.oauthStart));
authRouter.get("/oauth/:provider/callback", asyncHandler(authController.oauthCallback));
