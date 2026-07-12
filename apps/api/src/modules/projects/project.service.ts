import { randomBytes } from "node:crypto";
import { In } from "typeorm";
import { AppDataSource } from "../../config/data-source.js";
import { Project } from "../../entities/project.entity.js";
import { ProjectMember } from "../../entities/project-member.entity.js";
import { ProjectInvite } from "../../entities/project-invite.entity.js";
import { WorkspaceMember } from "../../entities/workspace-member.entity.js";
import { Favorite } from "../../entities/favorite.entity.js";
import { Workspace } from "../../entities/workspace.entity.js";
import { User } from "../../entities/user.entity.js";
import { ApiError } from "../../common/api-error.js";
import { WorkspaceRole } from "../../common/roles.js";
import { emailService } from "../../common/email.service.js";
import { env } from "../../config/env.js";
import { isValidIdentifier, normalizeIdentifier, randomLogoProps } from "./project-identifier.js";

class ProjectService {
  /** Regras de visibilidade (seção 2.7 da spec): Guest só vê onde é membro; Member vê membro OU público; Admin vê tudo. */
  async listForWorkspace(workspaceId: string, requesterRole: WorkspaceRole, requesterUserId: string) {
    const qb = Project.getRepository()
      .createQueryBuilder("p")
      .where("p.workspaceId = :workspaceId", { workspaceId })
      .andWhere("p.archivedAt IS NULL");

    if (requesterRole < WorkspaceRole.ADMIN) {
      qb.andWhere(
        `(p.network = :publicNetwork OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm."projectId" = p.id AND pm."userId" = :userId AND pm."isActive" = true AND pm."deletedAt" IS NULL
        ))`,
        { publicNetwork: 2, userId: requesterUserId },
      );
      if (requesterRole < WorkspaceRole.MEMBER) {
        // Guest: só projetos onde é membro (remove a cláusula "público" acima).
        qb.andWhere(
          `EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm."projectId" = p.id AND pm."userId" = :userId2 AND pm."isActive" = true AND pm."deletedAt" IS NULL
          )`,
          { userId2: requesterUserId },
        );
      }
    }

    return qb.orderBy("p.createdAt", "DESC").getMany();
  }

  async create(workspace: Workspace, creator: User, input: {
    name: string;
    identifier: string;
    description?: string;
    network?: number;
    projectLeadId?: string | null;
    defaultAssigneeId?: string | null;
    emoji?: string | null;
  }) {
    const identifier = normalizeIdentifier(input.identifier);
    if (!isValidIdentifier(identifier)) {
      throw new ApiError(422, "invalid_identifier", "Identifier inválido.");
    }

    const existingIdentifier = await Project.findOne({ where: { workspaceId: workspace.id, identifier } });
    if (existingIdentifier) {
      throw new ApiError(409, "identifier_taken", "Este identifier já está em uso neste workspace.");
    }
    const existingName = await Project.findOne({ where: { workspaceId: workspace.id, name: input.name } });
    if (existingName) {
      throw new ApiError(409, "name_taken", "Já existe um projeto com este nome neste workspace.");
    }

    if (input.projectLeadId) {
      await this.assertActiveWorkspaceMember(workspace.id, input.projectLeadId, "project_lead_not_a_member");
    }
    if (input.defaultAssigneeId) {
      await this.assertActiveWorkspaceMember(workspace.id, input.defaultAssigneeId, "default_assignee_not_a_member");
    }

    return AppDataSource.transaction(async (manager) => {
      const project = manager.create(Project, {
        name: input.name,
        identifier,
        description: input.description ?? "",
        network: input.network ?? 2,
        workspaceId: workspace.id,
        projectLeadId: input.projectLeadId ?? null,
        defaultAssigneeId: input.defaultAssigneeId ?? null,
        emoji: input.emoji ?? null,
        logoProps: randomLogoProps(),
        timezone: workspace.timezone,
      });
      await manager.save(project);

      const admins = new Set([creator.id, ...(input.projectLeadId ? [input.projectLeadId] : [])]);
      for (const userId of admins) {
        const member = manager.create(ProjectMember, {
          workspaceId: workspace.id,
          projectId: project.id,
          userId,
          role: WorkspaceRole.ADMIN,
        });
        await manager.save(member);
      }

      // Nota: quando o domínio de metadados de Issue (States) existir, a
      // criação de projeto também deve semear os estados padrão aqui.
      return project;
    });
  }

  private async assertActiveWorkspaceMember(workspaceId: string, userId: string, code: string) {
    const member = await WorkspaceMember.findOne({ where: { workspaceId, userId, isActive: true } });
    if (!member) {
      throw new ApiError(422, code, "Usuário precisa ser um membro ativo do workspace.");
    }
    return member;
  }

  async isIdentifierAvailable(workspaceId: string, identifier: string): Promise<boolean> {
    const normalized = normalizeIdentifier(identifier);
    if (!isValidIdentifier(normalized)) return false;
    const existing = await Project.findOne({ where: { workspaceId, identifier: normalized } });
    return !existing;
  }

  async findByIdOrThrow(workspaceId: string, projectId: string): Promise<Project> {
    const project = await Project.findOne({ where: { id: projectId, workspaceId } });
    if (!project) {
      throw new ApiError(404, "project_not_found", "Projeto não encontrado.");
    }
    return project;
  }

  async getMembership(projectId: string, userId: string): Promise<ProjectMember | null> {
    return ProjectMember.findOne({ where: { projectId, userId, isActive: true } });
  }

  async update(project: Project, input: Partial<Project>) {
    if (project.archivedAt) {
      throw new ApiError(422, "project_archived", "Desarquive o projeto antes de editá-lo.");
    }
    Object.assign(project, input);
    await project.save();
    return project;
  }

  async archive(project: Project) {
    project.archivedAt = new Date();
    await project.save();
    await Favorite.getRepository().delete({ entityType: "project", entityId: project.id });
    return project;
  }

  async unarchive(project: Project) {
    project.archivedAt = null;
    await project.save();
    return project;
  }

  async remove(project: Project) {
    await AppDataSource.transaction(async (manager) => {
      await manager.delete(Favorite, { entityType: "project", entityId: project.id });
      await manager.remove(project);
    });
  }

  // ---- Membros ----

  async listMembers(projectId: string) {
    return ProjectMember.find({
      where: { projectId, isActive: true },
      relations: { user: true },
      order: { sortOrder: "ASC" },
    });
  }

  private assertRoleCoherentWithWorkspace(workspaceRole: WorkspaceRole, projectRole: WorkspaceRole) {
    if (workspaceRole === WorkspaceRole.ADMIN && projectRole !== WorkspaceRole.ADMIN) {
      throw new ApiError(
        422,
        "role_incoherent",
        "Um Admin de workspace só pode ter papel Admin no projeto.",
      );
    }
    if (workspaceRole === WorkspaceRole.GUEST && projectRole !== WorkspaceRole.GUEST) {
      throw new ApiError(
        422,
        "role_incoherent",
        "Um Guest de workspace só pode ter papel Guest no projeto.",
      );
    }
  }

  async addMembers(
    workspace: Workspace,
    project: Project,
    inputs: Array<{ userId: string; role: WorkspaceRole }>,
  ) {
    const created: ProjectMember[] = [];
    for (const input of inputs) {
      const workspaceMember = await this.assertActiveWorkspaceMember(
        workspace.id,
        input.userId,
        "not_a_workspace_member",
      );
      this.assertRoleCoherentWithWorkspace(workspaceMember.role, input.role);

      const existing = await ProjectMember.findOne({ where: { projectId: project.id, userId: input.userId } });
      if (existing) {
        existing.isActive = true;
        existing.role = input.role;
        await existing.save();
        created.push(existing);
        continue;
      }

      const siblingSortOrders = await ProjectMember.find({
        where: { workspaceId: workspace.id, userId: input.userId, isActive: true },
        select: { sortOrder: true },
      });
      const sortOrder =
        siblingSortOrders.length > 0 ? Math.min(...siblingSortOrders.map((m) => m.sortOrder)) - 10000 : 65535;

      const member = ProjectMember.create({
        workspaceId: workspace.id,
        projectId: project.id,
        userId: input.userId,
        role: input.role,
        sortOrder,
      });
      await member.save();
      created.push(member);

      const user = await User.findOneBy({ id: input.userId });
      if (user) {
        await emailService.sendProjectMemberAdded(user.email, project.name).catch(() => undefined);
      }
    }
    return created;
  }

  async updateMemberRole(
    project: Project,
    targetMemberId: string,
    newRole: WorkspaceRole,
    actor: { userId: string; effectiveRole: WorkspaceRole; isWorkspaceAdmin: boolean },
  ) {
    const target = await ProjectMember.findOne({ where: { id: targetMemberId, projectId: project.id, isActive: true } });
    if (!target) {
      throw new ApiError(404, "member_not_found", "Membro não encontrado.");
    }
    if (target.userId === actor.userId && !actor.isWorkspaceAdmin) {
      throw new ApiError(422, "cannot_change_own_role", "Você não pode alterar seu próprio papel.");
    }
    if (!actor.isWorkspaceAdmin && newRole >= actor.effectiveRole) {
      throw new ApiError(
        422,
        "cannot_assign_equal_or_higher_role",
        "Você não pode atribuir um papel igual ou superior ao seu.",
      );
    }

    const workspaceMember = await this.assertActiveWorkspaceMember(project.workspaceId, target.userId, "not_a_workspace_member");
    this.assertRoleCoherentWithWorkspace(workspaceMember.role, newRole);

    target.role = newRole;
    await target.save();
    return target;
  }

  async removeMember(project: Project, targetMemberId: string) {
    const target = await ProjectMember.findOne({ where: { id: targetMemberId, projectId: project.id, isActive: true } });
    if (!target) {
      throw new ApiError(404, "member_not_found", "Membro não encontrado.");
    }
    await this.assertNotLastAdmin(project.id, target);
    target.isActive = false;
    await target.save();
  }

  async leaveProject(project: Project, member: ProjectMember) {
    await this.assertNotLastAdmin(project.id, member);
    member.isActive = false;
    await member.save();
  }

  private async assertNotLastAdmin(projectId: string, target: ProjectMember) {
    if (target.role !== WorkspaceRole.ADMIN) return;
    const adminCount = await ProjectMember.count({ where: { projectId, role: WorkspaceRole.ADMIN, isActive: true } });
    if (adminCount <= 1) {
      throw new ApiError(422, "last_admin", "Não é possível remover o último administrador do projeto.");
    }
  }

  async updatePreferences(project: Project, userId: string, patch: Record<string, unknown>) {
    const member = await this.getMembership(project.id, userId);
    if (!member) {
      throw new ApiError(403, "not_a_member", "Você não é membro deste projeto.");
    }
    member.preferences = { ...member.preferences, ...patch };
    await member.save();
    return member;
  }

  // ---- Convites ----

  async createInvites(
    workspace: Workspace,
    project: Project,
    invites: Array<{ email: string; role: WorkspaceRole; message?: string | null }>,
  ) {
    const created: ProjectInvite[] = [];
    for (const input of invites) {
      const email = input.email.toLowerCase();
      const existingInvite = await ProjectInvite.findOne({ where: { projectId: project.id, email } });
      if (existingInvite) continue;

      const existingMember = await ProjectMember.getRepository()
        .createQueryBuilder("pm")
        .innerJoin("pm.user", "u")
        .where("pm.projectId = :projectId", { projectId: project.id })
        .andWhere("pm.isActive = true")
        .andWhere("u.email = :email", { email })
        .getOne();
      if (existingMember) continue;

      const invite = ProjectInvite.create({
        workspaceId: workspace.id,
        projectId: project.id,
        email,
        role: input.role,
        message: input.message ?? null,
        token: randomBytes(24).toString("hex"),
      });
      await invite.save();
      created.push(invite);

      const url = `${env.WEB_URL}/project-invitations/${invite.token}`;
      await emailService.sendProjectInvite(email, project.name, url);
    }
    return created;
  }

  async listInvites(projectId: string) {
    return ProjectInvite.find({ where: { projectId }, order: { createdAt: "DESC" } });
  }

  async removeInvite(project: Project, inviteId: string) {
    const invite = await ProjectInvite.findOne({ where: { id: inviteId, projectId: project.id } });
    if (!invite) {
      throw new ApiError(404, "invite_not_found", "Convite não encontrado.");
    }
    if (invite.respondedAt) {
      throw new ApiError(422, "invite_already_responded", "Este convite já foi respondido.");
    }
    await invite.remove();
  }

  async getInviteByToken(token: string): Promise<ProjectInvite> {
    const invite = await ProjectInvite.findOne({ where: { token }, relations: { project: true } });
    if (!invite) {
      throw new ApiError(404, "invite_not_found", "Convite inválido ou já utilizado.");
    }
    return invite;
  }

  async acceptInviteByToken(token: string, user: User) {
    const invite = await this.getInviteByToken(token);
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ApiError(403, "invite_email_mismatch", "Este convite foi enviado para outro e-mail.");
    }
    const project = invite.project;
    await this.consumeInvite(invite, user);
    return project;
  }

  async declineInviteByToken(token: string, user: User) {
    const invite = await this.getInviteByToken(token);
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ApiError(403, "invite_email_mismatch", "Este convite foi enviado para outro e-mail.");
    }
    await invite.remove();
  }

  async autoJoinPendingInvites(user: User): Promise<void> {
    const invites = await ProjectInvite.find({ where: { email: user.email.toLowerCase() } });
    for (const invite of invites) {
      await this.consumeInvite(invite, user);
    }
  }

  async listPendingInvitesForUser(email: string) {
    return ProjectInvite.find({
      where: { email: email.toLowerCase() },
      relations: { project: true },
      order: { createdAt: "DESC" },
    });
  }

  async acceptInvitesByIds(user: User, inviteIds: string[]) {
    const invites = await ProjectInvite.find({ where: { id: In(inviteIds), email: user.email.toLowerCase() } });
    for (const invite of invites) {
      await this.consumeInvite(invite, user);
    }
  }

  private async consumeInvite(invite: ProjectInvite, user: User) {
    // Convite de projeto só se concretiza se o usuário já for (ou puder
    // ser) membro do workspace — projeto nunca existe fora de um workspace.
    const workspaceMember = await WorkspaceMember.findOne({
      where: { workspaceId: invite.workspaceId, userId: user.id, isActive: true },
    });
    if (!workspaceMember) return;

    await AppDataSource.transaction(async (manager) => {
      const existing = await manager.findOne(ProjectMember, {
        where: { projectId: invite.projectId, userId: user.id },
        withDeleted: true,
      });
      const role =
        workspaceMember.role === WorkspaceRole.GUEST
          ? WorkspaceRole.GUEST
          : workspaceMember.role === WorkspaceRole.ADMIN
            ? WorkspaceRole.ADMIN
            : invite.role;

      if (existing) {
        existing.isActive = true;
        existing.deletedAt = null;
        existing.role = role;
        await manager.save(existing);
      } else {
        const member = manager.create(ProjectMember, {
          workspaceId: invite.workspaceId,
          projectId: invite.projectId,
          userId: user.id,
          role,
        });
        await manager.save(member);
      }

      await manager.remove(invite);
    });
  }

  // ---- Favoritos ----

  async listFavorites(workspaceId: string, userId: string, entityType?: string) {
    return Favorite.find({ where: { workspaceId, userId, ...(entityType ? { entityType } : {}) } });
  }

  async addFavorite(workspaceId: string, userId: string, entityType: string, entityId: string) {
    const existing = await Favorite.findOne({ where: { workspaceId, userId, entityType, entityId } });
    if (existing) return existing;
    const favorite = Favorite.create({ workspaceId, userId, entityType, entityId });
    await favorite.save();
    return favorite;
  }

  async removeFavorite(workspaceId: string, userId: string, entityType: string, entityId: string) {
    await Favorite.getRepository().delete({ workspaceId, userId, entityType, entityId });
  }
}

export const projectService = new ProjectService();
