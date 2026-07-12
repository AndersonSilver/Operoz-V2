import type { NextFunction, Request, Response } from "express";
import { Page } from "../../entities/page.entity.js";
import { pageService } from "./page.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      page?: Page;
    }
  }
}

export async function loadPage(req: Request, _res: Response, next: NextFunction) {
  try {
    req.page = await pageService.findOrThrow(req.project!.id, req.params.pageId!, req.user!.id);
    next();
  } catch (err) {
    next(err);
  }
}
