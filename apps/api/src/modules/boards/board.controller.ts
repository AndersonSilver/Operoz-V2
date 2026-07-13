import type { Request, Response } from "express";
import { boardService } from "./board.service.js";
import { serializeBoardMember } from "./board.serializer.js";
import {
  addBoardMemberSchema,
  addBoardProjectSchema,
  createBoardSchema,
  updateBoardMemberSchema,
  updateBoardSchema,
} from "./board.schemas.js";

export const boardController = {
  async list(req: Request, res: Response) {
    const boards = await boardService.listForWorkspace(req.workspace!.id, req.workspaceMember!.role, req.user!.id);
    res.json({ boards });
  },

  async create(req: Request, res: Response) {
    const input = createBoardSchema.parse(req.body);
    const board = await boardService.create(req.workspace!, req.user!, input);
    res.status(201).json({ board });
  },

  async detail(req: Request, res: Response) {
    res.json({ board: req.board });
  },

  async update(req: Request, res: Response) {
    const input = updateBoardSchema.parse(req.body);
    const board = await boardService.update(req.board!, input);
    res.json({ board });
  },

  async remove(req: Request, res: Response) {
    await boardService.remove(req.board!);
    res.status(204).send();
  },

  async archive(req: Request, res: Response) {
    const board = await boardService.archive(req.board!);
    res.json({ board });
  },

  async unarchive(req: Request, res: Response) {
    const board = await boardService.unarchive(req.board!);
    res.json({ board });
  },

  async meta(req: Request, res: Response) {
    const meta = await boardService.meta(req.board!.id);
    res.json({ meta });
  },

  async listProjects(req: Request, res: Response) {
    const projects = await boardService.listProjects(req.board!.id);
    res.json({ projects });
  },

  async addProject(req: Request, res: Response) {
    const { projectId } = addBoardProjectSchema.parse(req.body);
    await boardService.addProject(req.board!, projectId);
    res.status(201).json({ projects: await boardService.listProjects(req.board!.id) });
  },

  async removeProject(req: Request, res: Response) {
    await boardService.removeProject(req.board!, req.params.projectId!);
    res.status(204).send();
  },

  async listMembers(req: Request, res: Response) {
    const members = await boardService.listMembers(req.board!.id);
    res.json({ members: members.map(serializeBoardMember) });
  },

  async addMember(req: Request, res: Response) {
    const input = addBoardMemberSchema.parse(req.body);
    const member = await boardService.addMember(req.board!, input.userId, input.role);
    res.status(201).json({ member: serializeBoardMember(member) });
  },

  async updateMember(req: Request, res: Response) {
    const { role } = updateBoardMemberSchema.parse(req.body);
    const member = await boardService.updateMemberRole(req.board!, req.params.memberId!, role);
    res.json({ member: serializeBoardMember(member) });
  },

  async removeMember(req: Request, res: Response) {
    await boardService.removeMember(req.board!, req.params.memberId!);
    res.status(204).send();
  },
};
