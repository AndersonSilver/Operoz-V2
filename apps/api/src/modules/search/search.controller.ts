import type { Request, Response } from "express";
import { searchService } from "./search.service.js";
import { searchQuerySchema } from "./search.schemas.js";

export const searchController = {
  async search(req: Request, res: Response) {
    const { query, types } = searchQuerySchema.parse(req.query);
    const results = await searchService.search(
      req.workspace!.id,
      req.workspaceMember!.role,
      req.user!.id,
      query,
      types,
    );
    res.json({ results });
  },
};
