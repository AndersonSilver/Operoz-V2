import type { EntityManager } from "typeorm";
import { Issue } from "../../entities/issue.entity.js";

/**
 * Gera o próximo `sequenceId` de um projeto de forma segura sob
 * concorrência. `pg_advisory_xact_lock` serializa chamadas concorrentes
 * para o MESMO projeto dentro da transação atual (liberado automaticamente
 * no commit/rollback); o `MAX` inclui linhas soft-deletadas de propósito
 * — o número de uma issue apagada nunca é reemitido.
 */
export async function nextSequenceId(manager: EntityManager, projectId: string): Promise<number> {
  await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [projectId]);

  const result = await manager
    .createQueryBuilder(Issue, "i")
    .withDeleted()
    .select("MAX(i.sequenceId)", "max")
    .where("i.projectId = :projectId", { projectId })
    .getRawOne<{ max: number | null }>();

  return (result?.max ?? 0) + 1;
}
