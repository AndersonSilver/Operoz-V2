import type { NextFunction, Request, Response } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "../common/redis.js";
import { ApiError } from "../common/api-error.js";

interface LimiterOptions {
  keyPrefix: string;
  points: number;
  durationSeconds: number;
  /** Como derivar a chave de limite a partir da request. Default: IP. */
  keyFn?: (req: Request) => string;
}

/**
 * Fábrica de rate limiters por Redis. O sistema anterior (documentado)
 * não tinha NENHUM rate limit em sign-in/sign-up por senha — uma lacuna
 * de segurança real, não um comportamento a preservar. Aqui, todo
 * endpoint sensível de autenticação passa por um limiter explícito.
 */
export function createRateLimiter(options: LimiterOptions) {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: options.keyPrefix,
    points: options.points,
    duration: options.durationSeconds,
  });

  return async function rateLimitMiddleware(req: Request, _res: Response, next: NextFunction) {
    const key = options.keyFn ? options.keyFn(req) : (req.ip ?? "unknown");
    try {
      await limiter.consume(key);
      next();
    } catch {
      next(
        new ApiError(
          429,
          "rate_limit_exceeded",
          "Muitas tentativas. Aguarde um pouco antes de tentar de novo.",
        ),
      );
    }
  };
}

// Por IP: previne credential-stuffing/brute-force distribuído por conta.
export const signInIpLimiter = createRateLimiter({
  keyPrefix: "rl:signin:ip",
  points: 20,
  durationSeconds: 15 * 60,
});

// Por e-mail: previne brute-force focado numa única conta.
export const signInEmailLimiter = createRateLimiter({
  keyPrefix: "rl:signin:email",
  points: 8,
  durationSeconds: 15 * 60,
  keyFn: (req) => String(req.body?.email ?? "unknown").toLowerCase(),
});

export const signUpIpLimiter = createRateLimiter({
  keyPrefix: "rl:signup:ip",
  points: 10,
  durationSeconds: 60 * 60,
});

export const magicLinkIpLimiter = createRateLimiter({
  keyPrefix: "rl:magiclink:ip",
  points: 5,
  durationSeconds: 10 * 60,
});

export const magicLinkEmailLimiter = createRateLimiter({
  keyPrefix: "rl:magiclink:email",
  points: 3,
  durationSeconds: 10 * 60,
  keyFn: (req) => String(req.body?.email ?? "unknown").toLowerCase(),
});

export const passwordResetIpLimiter = createRateLimiter({
  keyPrefix: "rl:pwreset:ip",
  points: 5,
  durationSeconds: 10 * 60,
});
