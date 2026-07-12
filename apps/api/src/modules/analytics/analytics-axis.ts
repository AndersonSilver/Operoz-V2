export const X_AXIS_VALUES = [
  "stateId",
  "stateGroup",
  "labelId",
  "assigneeId",
  "priority",
  "startDate",
  "targetDate",
  "createdAt",
  "completedAt",
] as const;
export type XAxis = (typeof X_AXIS_VALUES)[number];

/** Segment fica restrito a eixos "simples" (coluna direta em `issues`) — combinar dois eixos M2M no mesmo GROUP BY exigiria joins compostos fora do escopo desta reescrita. */
export const SEGMENT_AXIS_VALUES = ["stateId", "stateGroup", "priority"] as const;
export type SegmentAxis = (typeof SEGMENT_AXIS_VALUES)[number];

export const Y_AXIS_VALUES = ["issueCount", "estimate"] as const;
export type YAxis = (typeof Y_AXIS_VALUES)[number];

interface AxisSql {
  select: string;
  join?: string;
}

/** Cada eixo já embute o filtro de soft-delete da tabela de junção correspondente, quando aplicável. */
export function axisSql(axis: XAxis | SegmentAxis, alias: string): AxisSql {
  switch (axis) {
    case "stateId":
      return { select: `i."stateId" AS "${alias}"` };
    case "stateGroup":
      return { select: `s.group AS "${alias}"`, join: `LEFT JOIN states s ON s.id = i."stateId"` };
    case "labelId":
      return {
        select: `il."labelId" AS "${alias}"`,
        join: `LEFT JOIN issue_labels il ON il."issueId" = i.id AND il."deletedAt" IS NULL`,
      };
    case "assigneeId":
      return {
        select: `ia."assigneeId" AS "${alias}"`,
        join: `LEFT JOIN issue_assignees ia ON ia."issueId" = i.id AND ia."deletedAt" IS NULL`,
      };
    case "priority":
      return { select: `i.priority AS "${alias}"` };
    case "startDate":
      return { select: `to_char(date_trunc('month', i."startDate"), 'YYYY-MM') AS "${alias}"` };
    case "targetDate":
      return { select: `to_char(date_trunc('month', i."targetDate"), 'YYYY-MM') AS "${alias}"` };
    case "createdAt":
      return { select: `to_char(date_trunc('month', i."createdAt"), 'YYYY-MM') AS "${alias}"` };
    case "completedAt":
      return { select: `to_char(date_trunc('month', i."completedAt"), 'YYYY-MM') AS "${alias}"` };
  }
}
