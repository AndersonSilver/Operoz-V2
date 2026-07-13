import "reflect-metadata";
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import type { RequestHandler } from "express";
import type { IncomingMessage } from "node:http";
import pinoHttpImport, { type Options as PinoHttpOptions } from "pino-http";
// pino-http é CJS sem "type" no package.json; os tipos publicados usam
// `export default` para descrever um export que na verdade é
// `module.exports = fn`. Sob NodeNext isso faz o TS achar o import
// default "não chamável" — mas em runtime (Node ESM/CJS interop) o
// import default funciona normalmente (verificado manualmente). Cast de
// tipo pontual só aqui, sem mudar a forma do import (mudar para
// `import = require()` QUEBRA em runtime real sob "type": "module" —
// já aconteceu, não repita).
const pinoHttp = pinoHttpImport as unknown as (opts: PinoHttpOptions) => RequestHandler;
import { env } from "./config/env.js";
import { logger } from "./common/logger.js";
import { sessionMiddleware } from "./middleware/session.middleware.js";
import { csrfMiddleware } from "./middleware/csrf.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { workspaceRouter, workspaceInviteRouter } from "./modules/workspaces/workspace.routes.js";
import { projectInviteRouter } from "./modules/projects/project.routes.js";
import { timezoneRouter } from "./modules/misc/timezone.routes.js";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      // A API é consumida por SPAs em outras origens — CSP de página não
      // se aplica aqui (isso é responsabilidade dos apps de frontend).
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ALLOWED_ORIGINS.length > 0 ? env.CORS_ALLOWED_ORIGINS : false,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));
  app.use(cookieParser());
  app.use(sessionMiddleware);
  app.use(csrfMiddleware);

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req: IncomingMessage) => req.url === "/health" },
    }),
  );

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/timezones", timezoneRouter);

  app.use("/auth", authRouter);
  app.use("/users", userRouter);
  app.use("/workspaces", workspaceRouter);
  app.use("/workspace-invitations", workspaceInviteRouter);
  app.use("/project-invitations", projectInviteRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
