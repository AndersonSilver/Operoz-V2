import "dotenv/config";
import { z } from "zod";

const optionalOAuthProvider = (prefix: string) =>
  z.object({
    clientId: z.string().optional().default(""),
    clientSecret: z.string().optional().default(""),
    redirectUri: z.string().optional().default(""),
  }).transform((v) => ({ ...v, enabled: Boolean(v.clientId && v.clientSecret) }));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),

  REDIS_URL: z.string().min(1, "REDIS_URL é obrigatória"),

  SESSION_SECRET: z.string().min(16, "SESSION_SECRET precisa ter pelo menos 16 caracteres"),
  SESSION_COOKIE_NAME: z.string().default("operoz_session"),
  SESSION_COOKIE_MAX_AGE_MS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60 * 1000),
  COOKIE_DOMAIN: z.string().optional().default(""),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default("")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),

  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().default("Operoz <no-reply@operoz.local>"),

  WEB_URL: z.string().default("http://localhost:3001"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao validar variáveis de ambiente. Veja .env.example.");
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isDevelopment: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  smtp: {
    host: raw.SMTP_HOST,
    port: raw.SMTP_PORT,
    user: raw.SMTP_USER,
    password: raw.SMTP_PASSWORD,
    from: raw.SMTP_FROM,
    configured: Boolean(raw.SMTP_HOST),
  },
  oauth: {
    google: optionalOAuthProvider("GOOGLE").parse({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    }),
    github: optionalOAuthProvider("GITHUB").parse({
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI,
    }),
    gitlab: optionalOAuthProvider("GITLAB").parse({
      clientId: process.env.GITLAB_OAUTH_CLIENT_ID,
      clientSecret: process.env.GITLAB_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.GITLAB_OAUTH_REDIRECT_URI,
    }),
    gitea: {
      ...optionalOAuthProvider("GITEA").parse({
        clientId: process.env.GITEA_OAUTH_CLIENT_ID,
        clientSecret: process.env.GITEA_OAUTH_CLIENT_SECRET,
        redirectUri: process.env.GITEA_OAUTH_REDIRECT_URI,
      }),
      baseUrl: process.env.GITEA_BASE_URL ?? "",
    },
  },
};

export type Env = typeof env;
