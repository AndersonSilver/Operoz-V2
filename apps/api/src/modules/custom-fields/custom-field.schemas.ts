import { z } from "zod";
import { CUSTOM_FIELD_TYPES } from "../../entities/custom-field.entity.js";

const optionSchema = z.object({
  id: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  color: z.string().max(50).optional(),
});

export const createCustomFieldSchema = z
  .object({
    name: z.string().min(1).max(255),
    type: z.enum(CUSTOM_FIELD_TYPES),
    options: z.array(optionSchema).max(100).optional(),
    required: z.boolean().optional(),
  })
  .refine((v) => !["select", "multi_select"].includes(v.type) || (v.options && v.options.length > 0), {
    message: "Campos do tipo select/multi_select precisam de ao menos uma opção.",
    path: ["options"],
  });

export const updateCustomFieldSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  options: z.array(optionSchema).max(100).optional(),
  required: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const setIssueCustomFieldValuesSchema = z.object({
  values: z
    .array(z.object({ customFieldId: z.string().uuid(), value: z.unknown() }))
    .max(100),
});
