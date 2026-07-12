/**
 * Sanitização anti-CSV-injection: células que começam com `=`, `+`, `-`,
 * `@`, tab ou CR podem ser interpretadas como fórmula por Excel/Sheets ao
 * abrir o arquivo — prefixamos com `'` para neutralizar, mesma lista de
 * gatilhos usada pelo sistema original.
 */
const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function sanitizeCell(value: string): string {
  if (DANGEROUS_PREFIXES.some((p) => value.startsWith(p))) {
    return `'${value}`;
  }
  return value;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const header = columns.map((c) => escapeCsvField(sanitizeCell(c))).join(",");
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsvField(sanitizeCell(stringifyValue(row[col])))).join(","),
  );
  return [header, ...lines].join("\r\n");
}
