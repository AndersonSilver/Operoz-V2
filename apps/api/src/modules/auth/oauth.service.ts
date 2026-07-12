import { randomUUID } from "node:crypto";
import { redis } from "../../common/redis.js";
import { ApiError } from "../../common/api-error.js";
import { User } from "../../entities/user.entity.js";
import { Profile } from "../../entities/profile.entity.js";
import { Account, type OAuthProvider } from "../../entities/account.entity.js";
import { oauthProviders } from "./oauth.config.js";

const STATE_TTL_SECONDS = 10 * 60;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

class OAuthService {
  isProviderEnabled(provider: OAuthProvider): boolean {
    return oauthProviders[provider].enabled;
  }

  async createState(provider: OAuthProvider): Promise<string> {
    const state = randomUUID();
    await redis.set(`auth:oauth:state:${state}`, provider, "EX", STATE_TTL_SECONDS);
    return state;
  }

  async consumeState(state: string): Promise<OAuthProvider> {
    const key = `auth:oauth:state:${state}`;
    const provider = await redis.get(key);
    if (!provider) {
      throw new ApiError(400, "invalid_oauth_state", "Estado OAuth inválido ou expirado.");
    }
    await redis.del(key);
    return provider as OAuthProvider;
  }

  buildAuthorizeUrl(provider: OAuthProvider, state: string): string {
    const config = oauthProviders[provider];
    if (!config.enabled) {
      throw new ApiError(400, "provider_not_configured", `Provedor OAuth "${provider}" não configurado.`);
    }
    const url = new URL(config.authorizeUrl);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scope);
    url.searchParams.set("state", state);
    return url.toString();
  }

  private async exchangeCodeForToken(provider: OAuthProvider, code: string): Promise<TokenResponse> {
    const config = oauthProviders[provider];
    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      throw new ApiError(502, "oauth_token_exchange_failed", "Falha ao trocar código OAuth por token.");
    }
    return res.json() as Promise<TokenResponse>;
  }

  /**
   * Fluxo completo: troca code por token, busca perfil no provedor,
   * encontra ou cria User+Account, e retorna o usuário pronto para logar.
   */
  async handleCallback(provider: OAuthProvider, code: string): Promise<User> {
    const config = oauthProviders[provider];
    const tokens = await this.exchangeCodeForToken(provider, code);
    const profile = await config.fetchUserInfo(tokens.access_token);

    let account = await Account.findOne({
      where: { provider, providerAccountId: profile.providerAccountId },
      relations: { user: true },
    });

    if (account) {
      account.accessToken = tokens.access_token;
      account.refreshToken = tokens.refresh_token ?? account.refreshToken;
      account.tokenExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;
      account.providerEmail = profile.email;
      await account.save();
      return account.user;
    }

    // Sem conta vinculada ainda: associa por e-mail existente, ou cria novo usuário.
    let user = profile.email ? await User.findOne({ where: { email: profile.email } }) : null;
    if (!user) {
      if (!profile.email) {
        throw new ApiError(
          400,
          "oauth_email_required",
          "O provedor não retornou um e-mail para criar a conta.",
        );
      }
      user = User.create({
        email: profile.email.toLowerCase(),
        firstName: profile.name ?? "",
        lastName: "",
        avatarUrl: profile.avatarUrl,
        isEmailVerified: true,
      });
      await user.save();
      await Profile.create({ userId: user.id }).save();
    }

    account = Account.create({
      userId: user.id,
      provider,
      providerAccountId: profile.providerAccountId,
      providerEmail: profile.email,
    });
    account.accessToken = tokens.access_token;
    account.refreshToken = tokens.refresh_token ?? null;
    account.tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;
    await account.save();

    return user;
  }
}

export const oauthService = new OAuthService();
