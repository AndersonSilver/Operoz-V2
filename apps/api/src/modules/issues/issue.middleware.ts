import type { NextFunction, Request, Response } from "express";
import { Issue } from "../../entities/issue.entity.js";
import { issueService } from "./issue.service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      issue?: Issue;
    }
  }
}

export async function loadIssue(req: Request, _res: Response, next: NextFunction) {
  try {
    req.issue = await issueService.findOrThrow(req.project!.id, req.params.issueId!);
    next();
  } catch (err) {
    next(err);
  }
}
