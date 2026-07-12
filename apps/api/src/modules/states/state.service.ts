import type { EntityManager } from "typeorm";
import { State, type StateGroup } from "../../entities/state.entity.js";
import { Project } from "../../entities/project.entity.js";
import { ApiError } from "../../common/api-error.js";
import { slugify } from "./slugify.js";

const DEFAULT_STATES: Array<{ name: string; color: string; group: StateGroup; sequence: number; isDefault?: boolean }> = [
  { name: "Backlog", color: "#60646C", group: "backlog", sequence: 15000, isDefault: true },
  { name: "Todo", color: "#60646C", group: "unstarted", sequence: 25000 },
  { name: "In Progress", color: "#F59E0B", group: "started", sequence: 35000 },
  { name: "Done", color: "#46A759", group: "completed", sequence: 45000 },
  { name: "Cancelled", color: "#9AA4BC", group: "cancelled", sequence: 55000 },
];

const TRIAGE_STATE = { name: "Triage", color: "#4E5355", group: "triage" as StateGroup, sequence: 65000 };

class StateService {
  /** Chamado dentro da mesma transação de criação do projeto. */
  async seedDefaultStates(manager: EntityManager, project: Project): Promise<void> {
    let defaultState: State | undefined;
    for (const input of DEFAULT_STATES) {
      const state = manager.create(State, {
        projectId: project.id,
        name: input.name,
        color: input.color,
        group: input.group,
        sequence: input.sequence,
        isDefault: input.isDefault ?? false,
        slug: slugify(input.name),
      });
      await manager.save(state);
      if (input.isDefault) defaultState = state;
    }
    if (defaultState) {
      project.defaultStateId = defaultState.id;
      await manager.save(project);
    }
  }

  async list(projectId: string) {
    return State.find({ where: { projectId }, order: { group: "ASC", sequence: "ASC" } });
  }

  async listForWorkspace(workspaceId: string, userId: string) {
    return State.getRepository()
      .createQueryBuilder("s")
      .innerJoin(
        "project_members",
        "pm",
        `pm."projectId" = s."projectId" AND pm."userId" = :userId AND pm."isActive" = true AND pm."deletedAt" IS NULL`,
        { userId },
      )
      .innerJoin("projects", "p", `p.id = s."projectId" AND p."workspaceId" = :workspaceId AND p."archivedAt" IS NULL`, {
        workspaceId,
      })
      .orderBy("s.group", "ASC")
      .addOrderBy("s.sequence", "ASC")
      .getMany();
  }

  async getOrCreateTriage(project: Project): Promise<State> {
    const existing = await State.findOne({ where: { projectId: project.id, group: "triage" } });
    if (existing) return existing;

    const state = State.create({
      projectId: project.id,
      name: TRIAGE_STATE.name,
      color: TRIAGE_STATE.color,
      group: TRIAGE_STATE.group,
      sequence: TRIAGE_STATE.sequence,
      isTriage: true,
      slug: slugify(TRIAGE_STATE.name),
    });
    await state.save();
    return state;
  }

  async create(project: Project, input: { name: string; description?: string; color: string; group: StateGroup }) {
    const existing = await State.findOne({ where: { projectId: project.id, name: input.name } });
    if (existing) {
      throw new ApiError(409, "state_name_taken", "Já existe um estado com este nome neste projeto.");
    }

    const maxSequence = await State.getRepository()
      .createQueryBuilder("s")
      .select("MAX(s.sequence)", "max")
      .where("s.projectId = :projectId", { projectId: project.id })
      .getRawOne<{ max: number | null }>();

    const state = State.create({
      projectId: project.id,
      name: input.name,
      description: input.description ?? "",
      color: input.color,
      group: input.group,
      sequence: (maxSequence?.max ?? 0) + 15000,
      slug: slugify(input.name),
    });
    await state.save();
    return state;
  }

  async update(
    project: Project,
    stateId: string,
    input: { name?: string; description?: string; color?: string; group?: StateGroup; isDefault?: boolean },
  ) {
    const state = await this.findOrThrow(project.id, stateId);

    if (input.name !== undefined) {
      state.name = input.name;
      state.slug = slugify(input.name);
    }
    if (input.description !== undefined) state.description = input.description;
    if (input.color !== undefined) state.color = input.color;
    if (input.group !== undefined) state.group = input.group;
    await state.save();

    if (input.isDefault) {
      await this.markDefault(project, state.id);
    }
    return state;
  }

  async markDefault(project: Project, stateId: string) {
    const state = await this.findOrThrow(project.id, stateId);
    await State.getRepository().manager.transaction(async (manager) => {
      await manager.update(State, { projectId: project.id, isDefault: true }, { isDefault: false });
      state.isDefault = true;
      await manager.save(state);
      project.defaultStateId = state.id;
      await manager.save(project);
    });
    return state;
  }

  async remove(project: Project, stateId: string) {
    const state = await this.findOrThrow(project.id, stateId);
    if (state.isDefault) {
      throw new ApiError(422, "cannot_delete_default_state", "Não é possível excluir o estado padrão do projeto.");
    }
    // A FK de Issue -> State é `RESTRICT` (decisão consciente, ver
    // entidade Issue): o Postgres rejeita este delete se houver issues
    // usando o estado, convertido para ApiError pelo error handler.
    await state.remove();
  }

  private async findOrThrow(projectId: string, stateId: string): Promise<State> {
    const state = await State.findOne({ where: { id: stateId, projectId } });
    if (!state) {
      throw new ApiError(404, "state_not_found", "Estado não encontrado.");
    }
    return state;
  }
}

export const stateService = new StateService();
