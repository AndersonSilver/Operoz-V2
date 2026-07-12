import { IssueView } from "../../entities/issue-view.entity.js";
import { Favorite } from "../../entities/favorite.entity.js";
import { Project } from "../../entities/project.entity.js";
import { Workspace } from "../../entities/workspace.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { WorkspaceRole } from "../../common/roles.js";

interface ViewWriteInput {
  name?: string;
  description?: string;
  filters?: Record<string, unknown>;
  displayFilters?: Record<string, unknown>;
  displayProperties?: Record<string, unknown>;
  access?: number;
  logoProps?: Record<string, unknown>;
}

/** Placeholder consciente: compila `filters` em `query` — passthrough até existir um motor de query de filtros dedicado. */
function compileQuery(filters: Record<string, unknown>): Record<string, unknown> {
  return filters;
}

class ViewService {
  async listForProject(projectId: string) {
    return IssueView.find({ where: { projectId }, order: { createdAt: "DESC" } });
  }

  async listForWorkspace(workspaceId: string) {
    return IssueView.getRepository()
      .createQueryBuilder("v")
      .where("v.workspaceId = :workspaceId", { workspaceId })
      .andWhere("v.projectId IS NULL")
      .orderBy("v.createdAt", "DESC")
      .getMany();
  }

  async findOrThrow(workspaceId: string, viewId: string): Promise<IssueView> {
    const view = await IssueView.findOne({ where: { id: viewId, workspaceId } });
    if (!view) {
      throw new ApiError(404, "view_not_found", "View não encontrada.");
    }
    return view;
  }

  async createForProject(project: Project, actor: User, input: ViewWriteInput) {
    return this.create({ workspaceId: project.workspaceId, projectId: project.id }, actor, input);
  }

  async createForWorkspace(workspace: Workspace, actor: User, input: ViewWriteInput) {
    return this.create({ workspaceId: workspace.id, projectId: null }, actor, input);
  }

  private async create(scope: { workspaceId: string; projectId: string | null }, actor: User, input: ViewWriteInput) {
    if (!input.name) {
      throw new ApiError(422, "name_required", "Nome é obrigatório.");
    }
    const filters = input.filters ?? {};

    const view = IssueView.create({
      workspaceId: scope.workspaceId,
      projectId: scope.projectId,
      name: input.name,
      description: input.description ?? "",
      filters,
      query: compileQuery(filters),
      displayFilters: input.displayFilters ?? {},
      displayProperties: input.displayProperties ?? {},
      access: input.access ?? 1,
      logoProps: input.logoProps ?? {},
      ownedById: actor.id,
    });
    await view.save();
    return view;
  }

  async update(view: IssueView, actor: User, input: ViewWriteInput) {
    if (view.ownedById !== actor.id) {
      throw new ApiError(403, "only_owner_can_edit", "Só o dono pode editar esta view.");
    }
    if (view.isLocked) {
      throw new ApiError(422, "view_locked", "Esta view está bloqueada para edição.");
    }
    Object.assign(view, input);
    if (input.filters) view.query = compileQuery(input.filters);
    await view.save();
    return view;
  }

  async remove(view: IssueView, actor: User, isWorkspaceAdmin: boolean, projectRole: number): Promise<void> {
    const isOwner = view.ownedById === actor.id;
    const isAdmin = isWorkspaceAdmin || projectRole >= WorkspaceRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ApiError(403, "insufficient_permission", "Apenas o dono ou um Admin pode excluir esta view.");
    }
    await Favorite.getRepository().delete({ entityType: "view", entityId: view.id });
    await view.remove();
  }
}

export const viewService = new ViewService();
