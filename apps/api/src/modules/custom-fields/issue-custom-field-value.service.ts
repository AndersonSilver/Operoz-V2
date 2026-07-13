import { CustomField } from "../../entities/custom-field.entity.js";
import { IssueCustomFieldValue } from "../../entities/issue-custom-field-value.entity.js";
import { Issue } from "../../entities/issue.entity.js";
import { ApiError } from "../../common/api-error.js";

/**
 * Normaliza `raw` para a forma esperada pelo `type` do campo, validando
 * contra as opções cadastradas quando aplicável. Lança 422 com o motivo
 * exato em vez de silenciosamente truncar/converter um valor inválido.
 */
function coerceValue(field: CustomField, raw: unknown): unknown {
  if (raw === null || raw === undefined) {
    if (field.required) {
      throw new ApiError(422, "custom_field_value_required", `O campo "${field.name}" é obrigatório.`);
    }
    return null;
  }

  switch (field.type) {
    case "text":
    case "url":
      if (typeof raw !== "string") {
        throw new ApiError(422, "invalid_custom_field_value", `O campo "${field.name}" espera um texto.`);
      }
      return raw;
    case "number": {
      const num = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(num)) {
        throw new ApiError(422, "invalid_custom_field_value", `O campo "${field.name}" espera um número.`);
      }
      return num;
    }
    case "checkbox":
      if (typeof raw !== "boolean") {
        throw new ApiError(422, "invalid_custom_field_value", `O campo "${field.name}" espera verdadeiro/falso.`);
      }
      return raw;
    case "date": {
      if (typeof raw !== "string" || Number.isNaN(new Date(raw).getTime())) {
        throw new ApiError(422, "invalid_custom_field_value", `O campo "${field.name}" espera uma data válida.`);
      }
      return raw;
    }
    case "select": {
      if (typeof raw !== "string" || !field.options.some((o) => o.id === raw)) {
        throw new ApiError(422, "invalid_custom_field_value", `Opção inválida para o campo "${field.name}".`);
      }
      return raw;
    }
    case "multi_select": {
      if (!Array.isArray(raw) || !raw.every((v) => typeof v === "string" && field.options.some((o) => o.id === v))) {
        throw new ApiError(422, "invalid_custom_field_value", `Opção inválida para o campo "${field.name}".`);
      }
      return raw;
    }
    default:
      throw new ApiError(422, "invalid_custom_field_type", "Tipo de campo desconhecido.");
  }
}

class IssueCustomFieldValueService {
  async list(issueId: string): Promise<Array<{ customFieldId: string; value: unknown }>> {
    const rows = await IssueCustomFieldValue.createQueryBuilder("v")
      .innerJoin(CustomField, "f", 'f.id = v."customFieldId" AND f."deletedAt" IS NULL')
      .where("v.issueId = :issueId", { issueId })
      .select(['v."customFieldId" AS "customFieldId"', 'v.value AS "value"'])
      .getRawMany<{ customFieldId: string; value: unknown }>();
    return rows;
  }

  async set(
    issue: Issue,
    values: Array<{ customFieldId: string; value?: unknown }>,
  ): Promise<Array<{ customFieldId: string; value: unknown }>> {
    for (const { customFieldId, value } of values) {
      const field = await CustomField.findOneBy({ id: customFieldId, projectId: issue.projectId });
      if (!field) {
        throw new ApiError(404, "custom_field_not_found", "Campo customizado não encontrado neste projeto.");
      }
      const coerced = coerceValue(field, value);

      const existing = await IssueCustomFieldValue.findOneBy({ issueId: issue.id, customFieldId });
      if (coerced === null) {
        if (existing) await existing.remove();
        continue;
      }
      if (existing) {
        existing.value = coerced;
        await existing.save();
      } else {
        await IssueCustomFieldValue.create({ issueId: issue.id, customFieldId, value: coerced }).save();
      }
    }

    return this.list(issue.id);
  }
}

export const issueCustomFieldValueService = new IssueCustomFieldValueService();
