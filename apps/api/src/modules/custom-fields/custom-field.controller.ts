import type { Request, Response } from "express";
import { customFieldService } from "./custom-field.service.js";
import { createCustomFieldSchema, updateCustomFieldSchema } from "./custom-field.schemas.js";

export const customFieldController = {
  async list(req: Request, res: Response) {
    const fields = await customFieldService.list(req.project!.id);
    res.json({ customFields: fields });
  },

  async create(req: Request, res: Response) {
    const input = createCustomFieldSchema.parse(req.body);
    const field = await customFieldService.create(req.project!, input);
    res.status(201).json({ customField: field });
  },

  async update(req: Request, res: Response) {
    const input = updateCustomFieldSchema.parse(req.body);
    const field = await customFieldService.update(req.project!, req.params.fieldId!, input);
    res.json({ customField: field });
  },

  async remove(req: Request, res: Response) {
    await customFieldService.remove(req.project!, req.params.fieldId!);
    res.status(204).send();
  },
};
