import { Estimate, type EstimateType } from "../../entities/estimate.entity.js";
import { EstimatePoint } from "../../entities/estimate-point.entity.js";
import { Project } from "../../entities/project.entity.js";
import { AppDataSource } from "../../config/data-source.js";
import { ApiError } from "../../common/api-error.js";

interface PointInput {
  key: number;
  value: string;
  description?: string;
}

class EstimateService {
  async list(projectId: string) {
    return Estimate.find({ where: { projectId }, relations: { points: true }, order: { name: "ASC" } });
  }

  async listForWorkspace(workspaceId: string, userId: string) {
    return Estimate.getRepository()
      .createQueryBuilder("e")
      .innerJoin(
        "project_members",
        "pm",
        `pm."projectId" = e."projectId" AND pm."userId" = :userId AND pm."isActive" = true AND pm."deletedAt" IS NULL`,
        { userId },
      )
      .innerJoin("projects", "p", `p.id = e."projectId" AND p."workspaceId" = :workspaceId AND p."archivedAt" IS NULL`, {
        workspaceId,
      })
      .orderBy("e.name", "ASC")
      .getMany();
  }

  async findOrThrow(projectId: string, estimateId: string): Promise<Estimate> {
    const estimate = await Estimate.findOne({
      where: { id: estimateId, projectId },
      relations: { points: true },
    });
    if (!estimate) {
      throw new ApiError(404, "estimate_not_found", "Sistema de estimativa não encontrado.");
    }
    return estimate;
  }

  private assertUniqueKeys(points: PointInput[]) {
    const keys = new Set<number>();
    for (const point of points) {
      if (keys.has(point.key)) {
        throw new ApiError(422, "duplicate_point_key", `A chave ${point.key} aparece mais de uma vez.`);
      }
      keys.add(point.key);
    }
  }

  async create(project: Project, input: { name: string; description?: string; type: EstimateType; points: PointInput[] }) {
    const existing = await Estimate.findOne({ where: { projectId: project.id, name: input.name } });
    if (existing) {
      throw new ApiError(409, "estimate_name_taken", "Já existe um sistema de estimativa com este nome.");
    }
    this.assertUniqueKeys(input.points);

    const createdId = await AppDataSource.transaction(async (manager) => {
      const estimate = manager.create(Estimate, {
        projectId: project.id,
        name: input.name,
        description: input.description ?? "",
        type: input.type,
      });
      await manager.save(estimate);

      for (const point of input.points) {
        const entity = manager.create(EstimatePoint, { estimateId: estimate.id, ...point });
        await manager.save(entity);
      }

      return estimate.id;
    });

    // Lido fora da transação, depois do commit: um `findOrThrow` que usa
    // o repositório global (não o `manager` transacional) não enxergaria
    // as linhas ainda não confirmadas se rodasse por dentro da transação.
    return this.findOrThrow(project.id, createdId);
  }

  async update(
    project: Project,
    estimateId: string,
    input: { name?: string; description?: string; type?: EstimateType; points?: PointInput[] },
  ) {
    const estimate = await this.findOrThrow(project.id, estimateId);

    await AppDataSource.transaction(async (manager) => {
      if (input.name !== undefined) estimate.name = input.name;
      if (input.description !== undefined) estimate.description = input.description;
      if (input.type !== undefined) estimate.type = input.type;
      await manager.save(estimate);

      if (input.points) {
        this.assertUniqueKeys(input.points);
        // Substitui o lote inteiro. Issues que referenciavam os pontos
        // antigos perdem a estimativa (FK `SET NULL`) — não há migração
        // automática de valores entre sistemas, decisão documentada.
        await manager.delete(EstimatePoint, { estimateId: estimate.id });
        for (const point of input.points) {
          const entity = manager.create(EstimatePoint, { estimateId: estimate.id, ...point });
          await manager.save(entity);
        }
      }
    });

    return this.findOrThrow(project.id, estimateId);
  }

  async remove(project: Project, estimateId: string) {
    const estimate = await this.findOrThrow(project.id, estimateId);
    await AppDataSource.transaction(async (manager) => {
      await manager.remove(estimate);
      if (project.estimateId === estimateId) {
        project.estimateId = null;
        await manager.save(project);
      }
    });
  }

  async activate(project: Project, estimateId: string) {
    const estimate = await this.findOrThrow(project.id, estimateId);
    await AppDataSource.transaction(async (manager) => {
      await manager.update(Estimate, { projectId: project.id, lastUsed: true }, { lastUsed: false });
      estimate.lastUsed = true;
      await manager.save(estimate);
      project.estimateId = estimate.id;
      await manager.save(project);
    });
    return estimate;
  }

  async deactivate(project: Project) {
    project.estimateId = null;
    await project.save();
  }

  async getActivePoints(project: Project) {
    if (!project.estimateId) return [];
    return EstimatePoint.find({ where: { estimateId: project.estimateId }, order: { key: "ASC" } });
  }

  async addPoint(project: Project, estimateId: string, input: PointInput) {
    const estimate = await this.findOrThrow(project.id, estimateId);
    const existing = await EstimatePoint.findOne({ where: { estimateId: estimate.id, key: input.key } });
    if (existing) {
      throw new ApiError(409, "point_key_taken", "Já existe um ponto com esta chave neste sistema.");
    }
    const point = EstimatePoint.create({ estimateId: estimate.id, ...input });
    await point.save();
    return point;
  }

  async updatePoint(
    project: Project,
    estimateId: string,
    pointId: string,
    input: { key?: number; value?: string; description?: string },
  ) {
    await this.findOrThrow(project.id, estimateId);
    const point = await EstimatePoint.findOne({ where: { id: pointId, estimateId } });
    if (!point) {
      throw new ApiError(404, "estimate_point_not_found", "Ponto de estimativa não encontrado.");
    }
    if (input.key !== undefined && input.key !== point.key) {
      const existing = await EstimatePoint.findOne({ where: { estimateId, key: input.key } });
      if (existing) {
        throw new ApiError(409, "point_key_taken", "Já existe um ponto com esta chave neste sistema.");
      }
    }
    Object.assign(point, input);
    await point.save();
    return point;
  }

  async removePoint(project: Project, estimateId: string, pointId: string) {
    await this.findOrThrow(project.id, estimateId);
    const point = await EstimatePoint.findOne({ where: { id: pointId, estimateId } });
    if (!point) {
      throw new ApiError(404, "estimate_point_not_found", "Ponto de estimativa não encontrado.");
    }
    // Nota: quando Issue existir, reatribuir issues que usam este ponto
    // para outro (se informado) antes de remover; por ora a FK ainda não
    // existe, então a remoção é direta.
    await point.remove();
  }
}

export const estimateService = new EstimateService();
