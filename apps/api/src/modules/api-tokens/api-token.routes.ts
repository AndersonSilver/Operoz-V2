import { Router } from "express";
import { apiTokenController } from "./api-token.controller.js";
import { asyncHandler } from "../../common/async-handler.js";

/** Montado em `/users/me/api-tokens` (depois de `requireAuth`). Sempre escopado ao usuário autenticado — self-service, sem hierarquia de Admin. */
export const apiTokenRouter = Router();

apiTokenRouter.get("/", asyncHandler(apiTokenController.list));
apiTokenRouter.post("/", asyncHandler(apiTokenController.create));
apiTokenRouter.get("/:tokenId", asyncHandler(apiTokenController.detail));
apiTokenRouter.patch("/:tokenId", asyncHandler(apiTokenController.update));
apiTokenRouter.delete("/:tokenId", asyncHandler(apiTokenController.revoke));
