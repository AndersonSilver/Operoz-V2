import type { Request, Response } from "express";
import { issueCustomFieldValueService } from "./issue-custom-field-value.service.js";
import { setIssueCustomFieldValuesSchema } from "./custom-field.schemas.js";

export const issueCustomFieldValueController = {
  async list(req: Request, res: Response) {
    const values = await issueCustomFieldValueService.list(req.issue!.id);
    res.json({ values });
  },

  async set(req: Request, res: Response) {
    const { values } = setIssueCustomFieldValuesSchema.parse(req.body);
    const result = await issueCustomFieldValueService.set(req.issue!, values);
    res.json({ values: result });
  },
};
