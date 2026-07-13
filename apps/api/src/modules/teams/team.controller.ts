import type { Request, Response } from "express";
import { teamService } from "./team.service.js";
import { serializeTeamMember } from "./team.serializer.js";
import { addTeamMembersSchema, createTeamSchema, updateTeamSchema } from "./team.schemas.js";

export const teamController = {
  async list(req: Request, res: Response) {
    const teams = await teamService.list(req.workspace!.id);
    res.json({ teams });
  },

  async create(req: Request, res: Response) {
    const input = createTeamSchema.parse(req.body);
    const team = await teamService.create(req.workspace!, input, req.user!.id);
    res.status(201).json({ team });
  },

  async update(req: Request, res: Response) {
    const input = updateTeamSchema.parse(req.body);
    const team = await teamService.update(req.workspace!, req.params.teamId!, input);
    res.json({ team });
  },

  async remove(req: Request, res: Response) {
    await teamService.remove(req.workspace!, req.params.teamId!);
    res.status(204).send();
  },

  async listMembers(req: Request, res: Response) {
    const members = await teamService.listMembers(req.workspace!, req.params.teamId!);
    res.json({ members: members.map(serializeTeamMember) });
  },

  async addMembers(req: Request, res: Response) {
    const { userIds } = addTeamMembersSchema.parse(req.body);
    await teamService.addMembers(req.workspace!, req.params.teamId!, userIds);
    const members = await teamService.listMembers(req.workspace!, req.params.teamId!);
    res.status(201).json({ members: members.map(serializeTeamMember) });
  },

  async removeMember(req: Request, res: Response) {
    await teamService.removeMember(req.workspace!, req.params.teamId!, req.params.userId!);
    res.status(204).send();
  },
};
