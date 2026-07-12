import { randomBytes } from "node:crypto";
import { In } from "typeorm";
import { AppDataSource } from "../../config/data-source.js";
import { Workspace } from "../../entities/workspace.entity.js";
import { WorkspaceMember } from "../../entities/workspace-member.entity.js";
import { WorkspaceInvite } from "../../entities/workspace-invite.entity.js";
import { WorkspaceUserProperties } from "../../entities/workspace-user-properties.entity.js";
import { WorkspaceTheme } from "../../entities/workspace-theme.entity.js";
import { User } from "../../entities/user.entity.js";
import { Profile } from "../../entities/profile.entity.js";
import { ApiError } from "../../common/api-error.js";
import { WorkspaceRole } from "../../common/roles.js";
import { emailService } from "../../common/email.service.js";
import { env } from "../../config/env.js";
import {
  isRestrictedSlug,
  isValidSlugFormat,
  mangleSlugForDelete,
  randomBackgroundColor,
} from "./workspace-slug.js";

class WorkspaceService {
  async listForUser(userId: string) {
    const members = await WorkspaceMember.find({
      where: { userId, isActive: true },
      relations: { workspace: true },
      order: { createdAt: "ASC" },
    });
    const active = members.filter((m) => !m.workspace.deletedAt);
    const counts = await this.memberCounts(active.map((m) => m.workspaceId));
    return active.map((m) => ({
      workspace: m.workspace,
      role: m.role,
      memberCount: counts[m.workspaceId] ?? 1,
    }));
  }

  private async memberCounts(workspaceIds: string[]): Promise<Record<string, number>> {
    if (workspaceIds.length === 0) return {};
    const rows = await WorkspaceMember.getRepository()
      .createQueryBuilder("wm")
      .select("wm.workspaceId", "workspaceId")
      .addSelect("COUNT(*)", "count")
      .where("wm.workspaceId IN (:...ids)", { ids: workspaceIds })
      .andWhere("wm.isActive = true")
      .groupBy("wm.workspaceId")
      .getRawMany<{ workspaceId: string; count: string }>();
    return Object.fromEntries(rows.map((r) => [r.workspaceId, Number(r.count)]));
  }

  async create(owner: User, input: { name: string; slug: string; organizationSize?: string }) {
    if (isRestrictedSlug(input.slug)) {
      throw new ApiError(422, "slug_restricted", "Este slug não está disponível.");
    }
    if (!isValidSlugFormat(input.slug)) {
      throw new ApiError(422, "invalid_slug", "Slug inválido.");
    }
    const existing = await Workspace.findOne({ where: { slug: input.slug } });
    if (existing) {
      throw new ApiError(409, "slug_taken", "Este slug já está em uso.");
    }

    return AppDataSource.transaction(async (manager) => {
      const workspace = manager.create(Workspace, {
        name: input.name,
        slug: input.slug,
        organizationSize: input.organizationSize ?? null,
        ownerId: owner.id,
        backgroundColor: randomBackgroundColor(),
      });
      await manager.save(workspace);

      const member = manager.create(WorkspaceMember, {
        workspaceId: workspace.id,
        userId: owner.id,
        role: WorkspaceRole.ADMIN,
      });
      await manager.save(member);

      return workspace;
    });
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    if (isRestrictedSlug(slug) || !isValidSlugFormat(slug)) return false;
    const existing = await Workspace.findOne({ where: { slug } });
    return !existing;
  }

  async findBySlugOrThrow(slug: string): Promise<Workspace> {
    const workspace = await Workspace.findOne({ where: { slug } });
    if (!workspace) {
      throw new ApiError(404, "workspace_not_found", "Workspace não encontrado.");
    }
    return workspace;
  }

  async getMembership(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return WorkspaceMember.findOne({ where: { workspaceId, userId, isActive: true } });
  }

  async update(workspace: Workspace, input: Partial<Workspace>) {
    Object.assign(workspace, input);
    await workspace.save();
    return workspace;
  }

  async remove(workspace: Workspace) {
    await AppDataSource.transaction(async (manager) => {
      workspace.slug = mangleSlugForDelete(workspace.slug);
      await manager.save(workspace);
      await manager.softDelete(Workspace, workspace.id);
      await manager.update(Profile, { lastWorkspaceId: workspace.id }, { lastWorkspaceId: null });
    });
  }

  async transferOwnership(workspace: Workspace, actor: User, newOwnerUserId: string) {
    if (workspace.ownerId !== actor.id) {
      throw new ApiError(403, "not_owner", "Apenas o dono do workspace pode transferir a propriedade.");
    }
    if (newOwnerUserId === actor.id) {
      throw new ApiError(422, "already_owner", "Este usuário já é o dono do workspace.");
    }
    const newOwnerMember = await WorkspaceMember.findOne({
      where: { workspaceId: workspace.id, userId: newOwnerUserId, isActive: true },
      relations: { user: true },
    });
    if (!newOwnerMember) {
      throw new ApiError(422, "not_a_member", "O novo dono precisa ser um membro ativo do workspace.");
    }
    if (newOwnerMember.user.isBot) {
      throw new ApiError(422, "invalid_new_owner", "Não é possível transferir a propriedade para uma conta bot.");
    }
    if (newOwnerMember.role === WorkspaceRole.GUEST) {
      throw new ApiError(422, "invalid_new_owner", "O novo dono não pode ter papel Guest.");
    }

    await AppDataSource.transaction(async (manager) => {
      workspace.ownerId = newOwnerUserId;
      await manager.save(workspace);
      if (newOwnerMember.role !== WorkspaceRole.ADMIN) {
        newOwnerMember.role = WorkspaceRole.ADMIN;
        await manager.save(newOwnerMember);
      }
    });

    return workspace;
  }

  // ---- Membros ----

  async listMembers(workspaceId: string) {
    return WorkspaceMember.find({
      where: { workspaceId, isActive: true },
      relations: { user: true },
      order: { createdAt: "ASC" },
    });
  }

  async updateMemberRole(
    workspace: Workspace,
    targetMemberId: string,
    newRole: WorkspaceRole,
    actor: WorkspaceMember,
  ) {
    const target = await WorkspaceMember.findOne({
      where: { id: targetMemberId, workspaceId: workspace.id, isActive: true },
    });
    if (!target) {
      throw new ApiError(404, "member_not_found", "Membro não encontrado.");
    }
    if (target.userId === workspace.ownerId) {
      throw new ApiError(422, "cannot_change_owner_role", "Não é possível alterar o papel do dono do workspace.");
    }
    if (target.userId === actor.userId) {
      throw new ApiError(422, "cannot_change_own_role", "Você não pode alterar seu próprio papel.");
    }

    target.role = newRole;
    await target.save();
    // Quando o domínio de Projects existir, um rebaixamento para Guest
    // aqui também deve forçar todos os ProjectMember do usuário nesse
    // workspace para Guest (papel de projeto nunca excede o de workspace).
    return target;
  }

  async removeMember(workspace: Workspace, targetMemberId: string) {
    const target = await WorkspaceMember.findOne({
      where: { id: targetMemberId, workspaceId: workspace.id, isActive: true },
    });
    if (!target) {
      throw new ApiError(404, "member_not_found", "Membro não encontrado.");
    }
    if (target.userId === workspace.ownerId) {
      throw new ApiError(
        422,
        "cannot_remove_owner",
        "O dono do workspace não pode ser removido — transfira a propriedade primeiro.",
      );
    }
    await this.assertNotLastAdmin(workspace.id, target);

    target.isActive = false;
    await target.save();
  }

  async leave(workspace: Workspace, member: WorkspaceMember) {
    if (member.userId === workspace.ownerId) {
      throw new ApiError(
        422,
        "owner_cannot_leave",
        "O dono do workspace não pode sair — transfira a propriedade primeiro.",
      );
    }
    await this.assertNotLastAdmin(workspace.id, member);

    member.isActive = false;
    await member.save();
  }

  private async assertNotLastAdmin(workspaceId: string, target: WorkspaceMember) {
    if (target.role !== WorkspaceRole.ADMIN) return;
    const adminCount = await WorkspaceMember.count({
      where: { workspaceId, role: WorkspaceRole.ADMIN, isActive: true },
    });
    if (adminCount <= 1) {
      throw new ApiError(422, "last_admin", "Não é possível remover o último administrador do workspace.");
    }
  }

  // ---- Convites ----

  async createInvites(
    workspace: Workspace,
    inviter: User,
    invites: Array<{ email: string; role: WorkspaceRole; message?: string | null }>,
  ) {
    const created: WorkspaceInvite[] = [];
    for (const input of invites) {
      const email = input.email.toLowerCase();

      const existingInvite = await WorkspaceInvite.findOne({ where: { workspaceId: workspace.id, email } });
      if (existingInvite) continue; // já existe convite pendente — ignora silenciosamente no bulk

      const existingMember = await WorkspaceMember.getRepository()
        .createQueryBuilder("wm")
        .innerJoin("wm.user", "u")
        .where("wm.workspaceId = :workspaceId", { workspaceId: workspace.id })
        .andWhere("wm.isActive = true")
        .andWhere("u.email = :email", { email })
        .getOne();
      if (existingMember) continue; // já é membro

      const invite = WorkspaceInvite.create({
        workspaceId: workspace.id,
        email,
        role: input.role,
        message: input.message ?? null,
        token: randomBytes(24).toString("hex"),
      });
      await invite.save();
      created.push(invite);

      const url = `${env.WEB_URL}/workspace-invitations/${invite.token}`;
      await emailService.sendWorkspaceInvite(email, workspace.name, inviter.fullName, url);
    }
    return created;
  }

  async listInvites(workspaceId: string) {
    return WorkspaceInvite.find({ where: { workspaceId }, order: { createdAt: "DESC" } });
  }

  async removeInvite(workspace: Workspace, inviteId: string) {
    const invite = await WorkspaceInvite.findOne({ where: { id: inviteId, workspaceId: workspace.id } });
    if (!invite) {
      throw new ApiError(404, "invite_not_found", "Convite não encontrado.");
    }
    if (invite.respondedAt) {
      throw new ApiError(422, "invite_already_responded", "Este convite já foi respondido.");
    }
    await invite.remove();
  }

  async getInviteByToken(token: string): Promise<WorkspaceInvite> {
    const invite = await WorkspaceInvite.findOne({ where: { token }, relations: { workspace: true } });
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
    const workspace = invite.workspace;
    await this.consumeInvite(invite, user);
    return workspace;
  }

  async declineInviteByToken(token: string, user: User) {
    const invite = await this.getInviteByToken(token);
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ApiError(403, "invite_email_mismatch", "Este convite foi enviado para outro e-mail.");
    }
    await invite.remove();
  }

  /** Aceita todos os convites pendentes cujo e-mail bate com o do usuário — chamado em todo fluxo de login/signup bem-sucedido. */
  async autoJoinPendingInvites(user: User): Promise<void> {
    const invites = await WorkspaceInvite.find({ where: { email: user.email.toLowerCase() } });
    for (const invite of invites) {
      await this.consumeInvite(invite, user);
    }
  }

  async listPendingInvitesForUser(email: string) {
    return WorkspaceInvite.find({
      where: { email: email.toLowerCase() },
      relations: { workspace: true },
      order: { createdAt: "DESC" },
    });
  }

  async acceptInvitesByIds(user: User, inviteIds: string[]) {
    const invites = await WorkspaceInvite.find({
      where: { id: In(inviteIds), email: user.email.toLowerCase() },
    });
    for (const invite of invites) {
      await this.consumeInvite(invite, user);
    }
  }

  private async consumeInvite(invite: WorkspaceInvite, user: User) {
    await AppDataSource.transaction(async (manager) => {
      const existing = await manager.findOne(WorkspaceMember, {
        where: { workspaceId: invite.workspaceId, userId: user.id },
        withDeleted: true,
      });
      if (existing) {
        existing.isActive = true;
        existing.deletedAt = null;
        existing.role = invite.role;
        await manager.save(existing);
      } else {
        const member = manager.create(WorkspaceMember, {
          workspaceId: invite.workspaceId,
          userId: user.id,
          role: invite.role,
        });
        await manager.save(member);
      }

      await manager.update(Profile, { userId: user.id }, { lastWorkspaceId: invite.workspaceId });
      await manager.remove(invite);
    });
  }

  // ---- Preferências de UI ----

  async getOrCreateUserProperties(workspaceId: string, userId: string) {
    let props = await WorkspaceUserProperties.findOne({ where: { workspaceId, userId } });
    if (!props) {
      props = WorkspaceUserProperties.create({ workspaceId, userId });
      await props.save();
    }
    return props;
  }

  async updateUserProperties(workspaceId: string, userId: string, patch: Partial<WorkspaceUserProperties>) {
    const props = await this.getOrCreateUserProperties(workspaceId, userId);
    Object.assign(props, patch);
    await props.save();
    return props;
  }

  // ---- Temas ----

  async listThemes(workspaceId: string) {
    return WorkspaceTheme.find({ where: { workspaceId }, order: { createdAt: "ASC" } });
  }

  async createTheme(workspaceId: string, actorId: string, input: { name: string; colors: Record<string, string> }) {
    const existing = await WorkspaceTheme.findOne({ where: { workspaceId, name: input.name } });
    if (existing) {
      throw new ApiError(409, "theme_name_taken", "Já existe um tema com este nome.");
    }
    const theme = WorkspaceTheme.create({ workspaceId, actorId, name: input.name, colors: input.colors });
    await theme.save();
    return theme;
  }

  async updateTheme(
    workspaceId: string,
    themeId: string,
    input: { name?: string; colors?: Record<string, string> },
  ) {
    const theme = await WorkspaceTheme.findOne({ where: { id: themeId, workspaceId } });
    if (!theme) {
      throw new ApiError(404, "theme_not_found", "Tema não encontrado.");
    }
    Object.assign(theme, input);
    await theme.save();
    return theme;
  }

  async removeTheme(workspaceId: string, themeId: string) {
    const theme = await WorkspaceTheme.findOne({ where: { id: themeId, workspaceId } });
    if (!theme) {
      throw new ApiError(404, "theme_not_found", "Tema não encontrado.");
    }
    await theme.remove();
  }
}

export const workspaceService = new WorkspaceService();
