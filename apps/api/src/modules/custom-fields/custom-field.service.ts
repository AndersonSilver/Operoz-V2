import { CustomField, type CustomFieldOption, type CustomFieldType } from "../../entities/custom-field.entity.js";
import { Project } from "../../entities/project.entity.js";
import { ApiError } from "../../common/api-error.js";

class CustomFieldService {
  async list(projectId: string): Promise<CustomField[]> {
    return CustomField.find({ where: { projectId }, order: { sortOrder: "ASC" } });
  }

  async findOrThrow(projectId: string, fieldId: string): Promise<CustomField> {
    const field = await CustomField.findOneBy({ id: fieldId, projectId });
    if (!field) throw new ApiError(404, "custom_field_not_found", "Campo customizado não encontrado.");
    return field;
  }

  async create(
    project: Project,
    input: { name: string; type: CustomFieldType; options?: CustomFieldOption[]; required?: boolean },
  ): Promise<CustomField> {
    const existing = await CustomField.findOneBy({ projectId: project.id, name: input.name });
    if (existing) throw new ApiError(409, "custom_field_name_taken", "Já existe um campo com esse nome.");

    return CustomField.create({
      projectId: project.id,
      name: input.name,
      type: input.type,
      options: input.options ?? [],
      required: input.required ?? false,
    }).save();
  }

  /**
   * `type` é imutável após criação — permitir mudar invalidaria os
   * valores já gravados em `IssueCustomFieldValue` sem forma segura de
   * migrá-los automaticamente.
   */
  async update(
    project: Project,
    fieldId: string,
    input: { name?: string; options?: CustomFieldOption[]; required?: boolean; sortOrder?: number },
  ): Promise<CustomField> {
    const field = await this.findOrThrow(project.id, fieldId);
    if (input.name && input.name !== field.name) {
      const existing = await CustomField.findOneBy({ projectId: project.id, name: input.name });
      if (existing) throw new ApiError(409, "custom_field_name_taken", "Já existe um campo com esse nome.");
      field.name = input.name;
    }
    if (input.options !== undefined) {
      if (["select", "multi_select"].includes(field.type) && input.options.length === 0) {
        throw new ApiError(422, "options_required", "Campos do tipo select/multi_select precisam de ao menos uma opção.");
      }
      field.options = input.options;
    }
    if (input.required !== undefined) field.required = input.required;
    if (input.sortOrder !== undefined) field.sortOrder = input.sortOrder;
    return field.save();
  }

  async remove(project: Project, fieldId: string): Promise<void> {
    const field = await this.findOrThrow(project.id, fieldId);
    await field.softRemove();
  }
}

export const customFieldService = new CustomFieldService();
