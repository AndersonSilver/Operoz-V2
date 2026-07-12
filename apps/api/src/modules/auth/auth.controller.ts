import type { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { oauthService } from "./oauth.service.js";
import { establishSession, destroySession } from "./session.helper.js";
import { serializeUser } from "../users/user.serializer.js";
import { ApiError } from "../../common/api-error.js";
import { env } from "../../config/env.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./auth.schemas.js";
import type { OAuthProvider } from "../../entities/account.entity.js";

export const authController = {
  async signUp(req: Request, res: Response) {
    const input = signUpSchema.parse(req.body);
    const user = await authService.signUp(input);
    await establishSession(req, user);
    res.status(201).json({ user: serializeUser(user) });
  },

  async signIn(req: Request, res: Response) {
    const input = signInSchema.parse(req.body);
    const user = await authService.validateCredentials(input.email, input.password);
    await authService.recordLogin(user, req.ip);
    await establishSession(req, user);
    res.json({ user: serializeUser(user) });
  },

  async signOut(req: Request, res: Response) {
    await destroySession(req);
    res.clearCookie(env.SESSION_COOKIE_NAME);
    res.status(204).send();
  },

  async requestMagicLink(req: Request, res: Response) {
    const { email } = magicLinkRequestSchema.parse(req.body);
    await authService.requestMagicLink(email);
    // Resposta sempre igual, exista ou não a conta — não vaza enumeração de e-mail.
    res.json({ message: "Se o e-mail existir, um link de acesso foi enviado." });
  },

  async verifyMagicLink(req: Request, res: Response) {
    const { token } = magicLinkVerifySchema.parse(req.body);
    const user = await authService.consumeMagicLink(token);
    await establishSession(req, user);
    res.json({ user: serializeUser(user) });
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    res.json({ message: "Se o e-mail existir, enviamos instruções de redefinição." });
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    res.json({ message: "Senha redefinida com sucesso. Faça login novamente." });
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!, currentPassword, newPassword);
    res.json({ message: "Senha alterada com sucesso." });
  },

  async oauthStart(req: Request, res: Response) {
    const provider = req.params.provider as OAuthProvider;
    const state = await oauthService.createState(provider);
    const url = oauthService.buildAuthorizeUrl(provider, state);
    res.redirect(url);
  },

  async oauthCallback(req: Request, res: Response) {
    const provider = req.params.provider as OAuthProvider;
    const { code, state, error } = req.query as Record<string, string | undefined>;

    const redirectWithError = (reason: string) =>
      res.redirect(`${env.WEB_URL}/sign-in?oauth_error=${encodeURIComponent(reason)}`);

    if (error) return redirectWithError(error);
    if (!code || !state) return redirectWithError("missing_code_or_state");

    try {
      const expectedProvider = await oauthService.consumeState(state);
      if (expectedProvider !== provider) {
        return redirectWithError("provider_mismatch");
      }
      const user = await oauthService.handleCallback(provider, code);
      await establishSession(req, user);
      res.redirect(env.WEB_URL);
    } catch (err) {
      const message = err instanceof ApiError ? err.code : "oauth_failed";
      return redirectWithError(message);
    }
  },
};
