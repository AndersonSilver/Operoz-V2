import session from "express-session";
import RedisStore from "connect-redis";
import { redis } from "../common/redis.js";
import { env } from "../config/env.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    deviceInfo?: {
      userAgent?: string;
      ip?: string;
    };
  }
}

/**
 * Sessão baseada em cookie assinado + estado em Redis (não em JWT).
 * Escolhida deliberadamente: revogação imediata (logout / "sair de todos
 * os dispositivos" = apagar chaves no Redis) é trivial, o que não é o
 * caso com JWT stateless.
 */
export const sessionMiddleware = session({
  store: new RedisStore({ client: redis, prefix: "operoz:sess:" }),
  secret: env.SESSION_SECRET,
  name: env.SESSION_COOKIE_NAME,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    maxAge: env.SESSION_COOKIE_MAX_AGE_MS,
    domain: env.COOKIE_DOMAIN || undefined,
  },
});
