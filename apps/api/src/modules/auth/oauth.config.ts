import { env } from "../../config/env.js";
import type { OAuthProvider } from "../../entities/account.entity.js";

export interface OAuthUserInfo {
  providerAccountId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  enabled: boolean;
  scope: string;
  authorizeUrl: string;
  tokenUrl: string;
  /** Busca o perfil do usuário já normalizado no formato comum. */
  fetchUserInfo: (accessToken: string) => Promise<OAuthUserInfo>;
}

async function fetchJson(url: string, accessToken: string, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...extraHeaders },
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar perfil OAuth (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export const oauthProviders: Record<OAuthProvider, OAuthProviderConfig> = {
  google: {
    ...env.oauth.google,
    scope: "openid email profile",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    fetchUserInfo: async (accessToken) => {
      const data = (await fetchJson(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        accessToken,
      )) as { sub: string; email?: string; name?: string; picture?: string };
      return {
        providerAccountId: data.sub,
        email: data.email ?? null,
        name: data.name ?? null,
        avatarUrl: data.picture ?? null,
      };
    },
  },
  github: {
    ...env.oauth.github,
    scope: "read:user user:email",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    fetchUserInfo: async (accessToken) => {
      const data = (await fetchJson("https://api.github.com/user", accessToken)) as {
        id: number;
        login: string;
        name?: string;
        avatar_url?: string;
        email?: string;
      };
      let email = data.email ?? null;
      if (!email) {
        const emails = (await fetchJson("https://api.github.com/user/emails", accessToken)) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email ?? null;
      }
      return {
        providerAccountId: String(data.id),
        email,
        name: data.name ?? data.login,
        avatarUrl: data.avatar_url ?? null,
      };
    },
  },
  gitlab: {
    ...env.oauth.gitlab,
    scope: "read_user",
    authorizeUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    fetchUserInfo: async (accessToken) => {
      const data = (await fetchJson("https://gitlab.com/api/v4/user", accessToken)) as {
        id: number;
        email?: string;
        name?: string;
        avatar_url?: string;
      };
      return {
        providerAccountId: String(data.id),
        email: data.email ?? null,
        name: data.name ?? null,
        avatarUrl: data.avatar_url ?? null,
      };
    },
  },
  gitea: {
    ...env.oauth.gitea,
    scope: "read:user",
    authorizeUrl: `${env.oauth.gitea.baseUrl}/login/oauth/authorize`,
    tokenUrl: `${env.oauth.gitea.baseUrl}/login/oauth/access_token`,
    fetchUserInfo: async (accessToken) => {
      const data = (await fetchJson(
        `${env.oauth.gitea.baseUrl}/api/v1/user`,
        accessToken,
      )) as { id: number; email?: string; full_name?: string; avatar_url?: string };
      return {
        providerAccountId: String(data.id),
        email: data.email ?? null,
        name: data.full_name ?? null,
        avatarUrl: data.avatar_url ?? null,
      };
    },
  },
};
