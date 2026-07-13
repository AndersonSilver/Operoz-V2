import { IsNull } from "typeorm";
import { Board } from "../../entities/board.entity.js";
import { BoardMember } from "../../entities/board-member.entity.js";
import { BoardProject } from "../../entities/board-project.entity.js";
import { Project } from "../../entities/project.entity.js";
import { Workspace } from "../../entities/workspace.entity.js";
import { User } from "../../entities/user.entity.js";
import { WorkspaceMember } from "../../entities/workspace-member.entity.js";
import { ApiError } from "../../common/api-error.js";
import { WorkspaceRole } from "../../common/roles.js";
import { AppDataSource } from "../../config/data-source.js";

class BoardService {
  async listForWorkspace(workspaceId: string, requesterRole: WorkspaceRole, userId: string): Promise<Board[]> {
    if (requesterRole >= WorkspaceRole.ADMIN) {
      return Board.find({ where: { workspaceId, archivedAt: IsNull() }, order: { name: "ASC" } });
    }

    return Board.getRepository()
      .createQueryBuilder("b")
      .where("b.workspaceId = :workspaceId", { workspaceId })
      .andWhere("b.archivedAt IS NULL")
      .andWhere(
        `EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm."boardId" = b.id AND bm."userId" = :userId AND bm."deletedAt" IS NULL
        )`,
        { userId },
      )
      .orderBy("b.name", "ASC")
      .getMany();
  }

  async findByIdOrThrow(workspaceId: string, boardId: string): Promise<Board> {
    const board = await Board.findOneBy({ id: boardId, workspaceId });
    if (!board) throw new ApiError(404, "board_not_found", "Board não encontrado.");
    return board;
  }

  async getMembership(boardId: string, userId: string): Promise<BoardMember | null> {
    return BoardMember.findOneBy({ boardId, userId });
  }

  async create(workspace: Workspace, actor: User, input: { name: string; description?: string }): Promise<Board> {
    const board = await AppDataSource.transaction(async (manager) => {
      const created = manager.create(Board, {
        workspaceId: workspace.id,
        name: input.name,
        description: input.description ?? "",
        createdById: actor.id,
      });
      await manager.save(created);
      await manager.save(manager.create(BoardMember, { boardId: created.id, userId: actor.id, role: WorkspaceRole.ADMIN }));
      return created;
    });
    return board;
  }

  async update(board: Board, input: { name?: string; description?: string }): Promise<Board> {
    if (input.name !== undefined) board.name = input.name;
    if (input.description !== undefined) board.description = input.description;
    return board.save();
  }

  async archive(board: Board): Promise<Board> {
    board.archivedAt = new Date();
    return board.save();
  }

  async unarchive(board: Board): Promise<Board> {
    board.archivedAt = null;
    return board.save();
  }

  async remove(board: Board): Promise<void> {
    await board.softRemove();
  }

  async listProjects(boardId: string): Promise<Project[]> {
    return Project.getRepository()
      .createQueryBuilder("p")
      .innerJoin(BoardProject, "bp", 'bp."projectId" = p.id')
      .where("bp.boardId = :boardId", { boardId })
      .orderBy("p.name", "ASC")
      .getMany();
  }

  async addProject(board: Board, projectId: string): Promise<void> {
    const project = await Project.findOneBy({ id: projectId, workspaceId: board.workspaceId });
    if (!project) throw new ApiError(404, "project_not_found", "Projeto não encontrado neste workspace.");

    const existing = await BoardProject.findOneBy({ boardId: board.id, projectId });
    if (existing) return;
    await BoardProject.create({ boardId: board.id, projectId }).save();
  }

  async removeProject(board: Board, projectId: string): Promise<void> {
    const link = await BoardProject.findOneBy({ boardId: board.id, projectId });
    if (!link) throw new ApiError(404, "board_project_not_found", "Projeto não faz parte deste board.");
    await link.remove();
  }

  async listMembers(boardId: string): Promise<BoardMember[]> {
    return BoardMember.find({ where: { boardId }, relations: { user: true }, order: { createdAt: "ASC" } });
  }

  async addMember(board: Board, userId: string, role: WorkspaceRole): Promise<BoardMember> {
    const workspaceMembership = await WorkspaceMember.findOneBy({
      workspaceId: board.workspaceId,
      userId,
      isActive: true,
    });
    if (!workspaceMembership) {
      throw new ApiError(422, "not_workspace_member", "O usuário precisa ser membro ativo do workspace.");
    }

    const existing = await BoardMember.findOneBy({ boardId: board.id, userId });
    if (existing) throw new ApiError(409, "already_board_member", "Usuário já é membro deste board.");

    const created = await BoardMember.create({ boardId: board.id, userId, role }).save();
    return BoardMember.findOneOrFail({ where: { id: created.id }, relations: { user: true } });
  }

  async updateMemberRole(board: Board, memberId: string, role: WorkspaceRole): Promise<BoardMember> {
    const member = await BoardMember.findOneBy({ id: memberId, boardId: board.id });
    if (!member) throw new ApiError(404, "board_member_not_found", "Membro não encontrado.");
    member.role = role;
    await member.save();
    return BoardMember.findOneOrFail({ where: { id: member.id }, relations: { user: true } });
  }

  async removeMember(board: Board, memberId: string): Promise<void> {
    const member = await BoardMember.findOneBy({ id: memberId, boardId: board.id });
    if (!member) throw new ApiError(404, "board_member_not_found", "Membro não encontrado.");
    await member.remove();
  }

  /**
   * Agregação simples entre os projetos do board — sem depender do
   * motor de Analytics (eixos genéricos) para manter a query direta e
   * legível; `distribution` segue o mesmo agrupamento por `state.group`
   * usado em Analytics.
   */
  async meta(boardId: string) {
    const counts = await AppDataSource.query<
      Array<{ total: string; pending: string; overdue: string; due_this_week: string }>
    >(
      `
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE s.group NOT IN ('completed', 'cancelled')) AS pending,
        count(*) FILTER (
          WHERE i."targetDate" IS NOT NULL AND i."targetDate" < now()
            AND s.group NOT IN ('completed', 'cancelled')
        ) AS overdue,
        count(*) FILTER (
          WHERE i."targetDate" IS NOT NULL AND i."targetDate" >= now() AND i."targetDate" < now() + interval '7 days'
            AND s.group NOT IN ('completed', 'cancelled')
        ) AS due_this_week
      FROM issues i
      INNER JOIN board_projects bp ON bp."projectId" = i."projectId" AND bp."boardId" = $1
      INNER JOIN states s ON s.id = i."stateId"
      WHERE i."deletedAt" IS NULL AND i."archivedAt" IS NULL
      `,
      [boardId],
    );

    const distribution = await AppDataSource.query<Array<{ group: string; count: string }>>(
      `
      SELECT s.group AS group, count(*) AS count
      FROM issues i
      INNER JOIN board_projects bp ON bp."projectId" = i."projectId" AND bp."boardId" = $1
      INNER JOIN states s ON s.id = i."stateId"
      WHERE i."deletedAt" IS NULL AND i."archivedAt" IS NULL
      GROUP BY s.group
      `,
      [boardId],
    );

    const row = counts[0] ?? { total: "0", pending: "0", overdue: "0", due_this_week: "0" };
    return {
      total: Number(row.total),
      pending: Number(row.pending),
      overdue: Number(row.overdue),
      dueThisWeek: Number(row.due_this_week),
      distribution: distribution.map((d) => ({ group: d.group, count: Number(d.count) })),
    };
  }
}

export const boardService = new BoardService();
