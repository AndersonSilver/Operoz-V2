import { Router } from "express";
import multer from "multer";
import { assetController } from "./asset.controller.js";
import { asyncHandler } from "../../common/async-handler.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/** Montado em `/workspaces/:slug/assets` (depois de `loadWorkspace`). */
export const assetRouter = Router();

assetRouter.post("/", upload.single("file"), asyncHandler(assetController.upload));
assetRouter.get("/:assetId/content", asyncHandler(assetController.content));
assetRouter.delete("/:assetId", asyncHandler(assetController.remove));
