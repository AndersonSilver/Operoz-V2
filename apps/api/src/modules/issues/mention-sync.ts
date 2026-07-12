import type { EntityManager } from "typeorm";
import { IssueMention } from "../../entities/issue-mention.entity.js";

/**
 * Extrai IDs de usuário de nós de menção num documento rich-text no
 * formato TipTap/ProseMirror (`{ type: "mention", attrs: { id: "..." } }`,
 * convenção comum desse tipo de editor). Percorre a árvore recursivamente
 * via `content`.
 */
function extractMentionedUserIds(doc: Record<string, unknown> | null | undefined): Set<string> {
  const ids = new Set<string>();
  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (obj.type === "mention" && obj.attrs && typeof obj.attrs === "object") {
      const id = (obj.attrs as Record<string, unknown>).id;
      if (typeof id === "string" && id.length > 0) ids.add(id);
    }
    if (Array.isArray(obj.content)) {
      for (const child of obj.content) walk(child);
    }
  }
  walk(doc);
  return ids;
}

/**
 * Sincroniza `IssueMention` a partir do JSON de descrição — idempotente,
 * best-effort (nunca deve quebrar o save principal da issue se falhar).
 */
export async function syncIssueMentions(
  manager: EntityManager,
  issueId: string,
  descriptionJson: Record<string, unknown> | null | undefined,
): Promise<void> {
  try {
    const mentionedIds = extractMentionedUserIds(descriptionJson);
    const existing = await manager.find(IssueMention, { where: { issueId } });
    const existingIds = new Set(existing.map((m) => m.mentionedUserId));

    const toAdd = [...mentionedIds].filter((id) => !existingIds.has(id));
    const toRemove = existing.filter((m) => !mentionedIds.has(m.mentionedUserId));

    for (const userId of toAdd) {
      await manager.save(manager.create(IssueMention, { issueId, mentionedUserId: userId }));
    }
    if (toRemove.length > 0) {
      await manager.remove(toRemove);
    }
  } catch {
    // best-effort: falha ao sincronizar menções não deve derrubar o save da issue.
  }
}
