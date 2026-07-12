import type { Request, Response } from "express";
import { apiTokenService } from "./api-token.service.js";
import { serializeApiToken } from "./api-token.serializer.js";
import { createApiTokenSchema, updateApiTokenSchema } from "./api-token.schemas.js";

export const apiTokenController = {
  async list(req: Request, res: Response) {
    const tokens = await apiTokenService.list(req.user!.id);
    res.json({ apiTokens: tokens.map(serializeApiToken) });
  },

  async create(req: Request, res: Response) {
    const input = createApiTokenSchema.parse(req.body);
    const { token, rawValue } = await apiTokenService.create(req.user!, input);
    // Único momento em que o valor completo do token é exposto.
    res.status(201).json({ apiToken: serializeApiToken(token), token: rawValue });
  },

  async detail(req: Request, res: Response) {
    const token = await apiTokenService.findOrThrow(req.user!.id, req.params.tokenId!);
    res.json({ apiToken: serializeApiToken(token) });
  },

  async update(req: Request, res: Response) {
    const input = updateApiTokenSchema.parse(req.body);
    const token = await apiTokenService.findOrThrow(req.user!.id, req.params.tokenId!);
    const updated = await apiTokenService.update(token, input);
    res.json({ apiToken: serializeApiToken(updated) });
  },

  async revoke(req: Request, res: Response) {
    const token = await apiTokenService.findOrThrow(req.user!.id, req.params.tokenId!);
    await apiTokenService.revoke(token);
    res.status(204).send();
  },
};
