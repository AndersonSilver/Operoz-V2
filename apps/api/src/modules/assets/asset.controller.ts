import type { Request, Response } from "express";
import { assetService } from "./asset.service.js";
import { serializeAsset } from "./asset.serializer.js";
import { ApiError } from "../../common/api-error.js";

export const assetController = {
  async upload(req: Request, res: Response) {
    const file = req.file;
    if (!file) {
      throw new ApiError(422, "file_required", "Envie um arquivo no campo \"file\".");
    }
    const asset = await assetService.upload(req.workspace!, req.user!, {
      buffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });
    res.status(201).json({ asset: serializeAsset(asset, req.workspace!.slug) });
  },

  async content(req: Request, res: Response) {
    const asset = await assetService.findOrThrow(req.workspace!.id, req.params.assetId!);
    const buffer = await assetService.readContent(asset);
    res.setHeader("content-type", asset.mimeType);
    res.setHeader("content-disposition", `inline; filename="${encodeURIComponent(asset.fileName)}"`);
    res.send(buffer);
  },

  async remove(req: Request, res: Response) {
    await assetService.remove(req.workspace!, req.user!, req.workspaceMember!.role, req.params.assetId!);
    res.status(204).send();
  },
};
