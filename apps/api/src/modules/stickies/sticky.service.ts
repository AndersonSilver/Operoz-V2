import { Sticky } from "../../entities/sticky.entity.js";
import { ApiError } from "../../common/api-error.js";

class StickyService {
  async list(workspaceId: string, userId: string, query?: string): Promise<Sticky[]> {
    const qb = Sticky.createQueryBuilder("s")
      .where("s.workspaceId = :workspaceId", { workspaceId })
      .andWhere("s.userId = :userId", { userId })
      .orderBy("s.updatedAt", "DESC");

    if (query) {
      qb.andWhere("(s.title ILIKE :q OR s.description ILIKE :q)", { q: `%${query}%` });
    }

    return qb.getMany();
  }

  async findOwnedOrThrow(workspaceId: string, userId: string, stickyId: string): Promise<Sticky> {
    const sticky = await Sticky.findOneBy({ id: stickyId, workspaceId, userId });
    if (!sticky) throw new ApiError(404, "sticky_not_found", "Nota não encontrada.");
    return sticky;
  }

  async create(
    workspaceId: string,
    userId: string,
    input: { title?: string; description: string; color?: string },
  ): Promise<Sticky> {
    return Sticky.create({
      workspaceId,
      userId,
      title: input.title ?? null,
      description: input.description,
      color: input.color ?? null,
    }).save();
  }

  async update(
    workspaceId: string,
    userId: string,
    stickyId: string,
    input: { title?: string | null; description?: string; color?: string | null },
  ): Promise<Sticky> {
    const sticky = await this.findOwnedOrThrow(workspaceId, userId, stickyId);
    if (input.title !== undefined) sticky.title = input.title;
    if (input.description !== undefined) sticky.description = input.description;
    if (input.color !== undefined) sticky.color = input.color;
    return sticky.save();
  }

  async remove(workspaceId: string, userId: string, stickyId: string): Promise<void> {
    const sticky = await this.findOwnedOrThrow(workspaceId, userId, stickyId);
    await sticky.remove();
  }
}

export const stickyService = new StickyService();
