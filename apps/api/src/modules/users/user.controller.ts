import type { Request, Response } from "express";
import { z } from "zod";
import { serializeUser } from "./user.serializer.js";

const updateMeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  displayName: z.string().max(100).nullable().optional(),
  timezone: z.string().max(64).optional(),
  language: z.string().max(16).optional(),
});

export const userController = {
  async me(req: Request, res: Response) {
    res.json({ user: serializeUser(req.user!) });
  },

  async updateMe(req: Request, res: Response) {
    const input = updateMeSchema.parse(req.body);
    Object.assign(req.user!, input);
    await req.user!.save();
    res.json({ user: serializeUser(req.user!) });
  },
};
