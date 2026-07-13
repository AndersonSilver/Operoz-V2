import { Team } from "../../entities/team.entity.js";
import { TeamMember } from "../../entities/team-member.entity.js";
import { Workspace } from "../../entities/workspace.entity.js";
import { WorkspaceMember } from "../../entities/workspace-member.entity.js";
import { ApiError } from "../../common/api-error.js";

class TeamService {
  async list(workspaceId: string) {
    return Team.find({ where: { workspaceId }, order: { name: "ASC" } });
  }

  async findOrThrow(workspaceId: string, teamId: string): Promise<Team> {
    const team = await Team.findOneBy({ id: teamId, workspaceId });
    if (!team) throw new ApiError(404, "team_not_found", "Time não encontrado.");
    return team;
  }

  async create(
    workspace: Workspace,
    input: { name: string; description?: string },
    actorId: string,
  ): Promise<Team> {
    const existing = await Team.findOneBy({ workspaceId: workspace.id, name: input.name });
    if (existing) throw new ApiError(409, "team_name_taken", "Já existe um time com esse nome.");

    return Team.create({
      workspaceId: workspace.id,
      name: input.name,
      description: input.description ?? null,
      createdById: actorId,
    }).save();
  }

  async update(
    workspace: Workspace,
    teamId: string,
    input: { name?: string; description?: string | null },
  ): Promise<Team> {
    const team = await this.findOrThrow(workspace.id, teamId);
    if (input.name && input.name !== team.name) {
      const existing = await Team.findOneBy({ workspaceId: workspace.id, name: input.name });
      if (existing) throw new ApiError(409, "team_name_taken", "Já existe um time com esse nome.");
      team.name = input.name;
    }
    if (input.description !== undefined) team.description = input.description;
    return team.save();
  }

  async remove(workspace: Workspace, teamId: string): Promise<void> {
    const team = await this.findOrThrow(workspace.id, teamId);
    await team.softRemove();
  }

  async listMembers(workspace: Workspace, teamId: string) {
    await this.findOrThrow(workspace.id, teamId);
    return TeamMember.find({ where: { teamId }, relations: { user: true }, order: { createdAt: "ASC" } });
  }

  async addMembers(workspace: Workspace, teamId: string, userIds: string[]): Promise<void> {
    await this.findOrThrow(workspace.id, teamId);

    const memberships = await WorkspaceMember.find({
      where: { workspaceId: workspace.id, isActive: true },
    });
    const validUserIds = new Set(memberships.map((m) => m.userId));
    const invalidIds = userIds.filter((id) => !validUserIds.has(id));
    if (invalidIds.length > 0) {
      throw new ApiError(422, "not_workspace_member", "Todos os usuários precisam ser membros ativos do workspace.");
    }

    const existing = await TeamMember.find({ where: { teamId } });
    const existingUserIds = new Set(existing.map((m) => m.userId));
    const toAdd = userIds.filter((id) => !existingUserIds.has(id));

    for (const userId of toAdd) {
      await TeamMember.create({ teamId, userId }).save();
    }
  }

  async removeMember(workspace: Workspace, teamId: string, userId: string): Promise<void> {
    await this.findOrThrow(workspace.id, teamId);
    const member = await TeamMember.findOneBy({ teamId, userId });
    if (!member) throw new ApiError(404, "team_member_not_found", "Membro não encontrado neste time.");
    await member.remove();
  }
}

export const teamService = new TeamService();
