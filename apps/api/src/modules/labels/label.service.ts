import { Label } from "../../entities/label.entity.js";
import { Project } from "../../entities/project.entity.js";
import { ApiError } from "../../common/api-error.js";

class LabelService {
  async list(projectId: string) {
    return Label.find({ where: { projectId }, order: { createdAt: "DESC" } });
  }

  async listForWorkspace(workspaceId: string, userId: string) {
    return Label.getRepository()
      .createQueryBuilder("l")
      .innerJoin(
        "project_members",
        "pm",
        `pm."projectId" = l."projectId" AND pm."userId" = :userId AND pm."isActive" = true AND pm."deletedAt" IS NULL`,
        { userId },
      )
      .innerJoin("projects", "p", `p.id = l."projectId" AND p."archivedAt" IS NULL`)
      .where("l.workspaceId = :workspaceId", { workspaceId })
      .orderBy("l.createdAt", "DESC")
      .getMany();
  }

  private async assertNameAvailable(projectId: string, name: string, excludeId?: string) {
    const qb = Label.getRepository()
      .createQueryBuilder("l")
      .where("l.projectId = :projectId", { projectId })
      .andWhere("LOWER(l.name) = LOWER(:name)", { name });
    if (excludeId) qb.andWhere("l.id != :excludeId", { excludeId });
    const existing = await qb.getOne();
    if (existing) {
      throw new ApiError(409, "label_name_taken", "Já existe uma label com este nome neste projeto.");
    }
  }

  async create(
    project: Project,
    input: { name: string; description?: string; color?: string; parentId?: string | null },
  ) {
    await this.assertNameAvailable(project.id, input.name);
    if (input.parentId) {
      await this.assertParentInProject(project.id, input.parentId);
    }

    const maxSortOrder = await Label.getRepository()
      .createQueryBuilder("l")
      .select("MAX(l.sortOrder)", "max")
      .where("l.projectId = :projectId", { projectId: project.id })
      .getRawOne<{ max: number | null }>();

    const label = Label.create({
      workspaceId: project.workspaceId,
      projectId: project.id,
      name: input.name,
      description: input.description ?? "",
      color: input.color ?? "",
      parentId: input.parentId ?? null,
      sortOrder: (maxSortOrder?.max ?? 0) + 15000,
    });
    await label.save();
    return label;
  }

  async bulkCreate(project: Project, inputs: Array<{ name: string; color?: string }>) {
    const created: Label[] = [];
    for (const input of inputs) {
      const qb = Label.getRepository()
        .createQueryBuilder("l")
        .where("l.projectId = :projectId", { projectId: project.id })
        .andWhere("LOWER(l.name) = LOWER(:name)", { name: input.name });
      const existing = await qb.getOne();
      if (existing) continue; // ignora conflitos silenciosamente (paridade com o original)

      const label = Label.create({
        workspaceId: project.workspaceId,
        projectId: project.id,
        name: input.name,
        color: input.color ?? "",
      });
      await label.save();
      created.push(label);
    }
    return created;
  }

  async update(
    project: Project,
    labelId: string,
    input: { name?: string; description?: string; color?: string; parentId?: string | null; sortOrder?: number },
  ) {
    const label = await this.findOrThrow(project.id, labelId);
    if (input.name !== undefined && input.name.toLowerCase() !== label.name.toLowerCase()) {
      await this.assertNameAvailable(project.id, input.name, label.id);
    }
    if (input.parentId) {
      if (input.parentId === label.id) {
        throw new ApiError(422, "invalid_parent", "Uma label não pode ser pai de si mesma.");
      }
      await this.assertParentInProject(project.id, input.parentId);
    }
    Object.assign(label, input);
    await label.save();
    return label;
  }

  async remove(project: Project, labelId: string) {
    const label = await this.findOrThrow(project.id, labelId);
    await label.remove();
  }

  private async assertParentInProject(projectId: string, parentId: string) {
    const parent = await Label.findOne({ where: { id: parentId, projectId } });
    if (!parent) {
      throw new ApiError(422, "invalid_parent", "A label pai precisa pertencer ao mesmo projeto.");
    }
  }

  private async findOrThrow(projectId: string, labelId: string): Promise<Label> {
    const label = await Label.findOne({ where: { id: labelId, projectId } });
    if (!label) {
      throw new ApiError(404, "label_not_found", "Label não encontrada.");
    }
    return label;
  }
}

export const labelService = new LabelService();
