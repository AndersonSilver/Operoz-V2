import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Sem S3/MinIO configurado neste ambiente: os arquivos gerados ficam em
 * disco local, servidos por um endpoint de download autenticado (em vez
 * de URL pré-assinada de storage externo). Mesmo padrão de deferimento
 * já aplicado a anexos de issue nesta reescrita.
 */
const EXPORTS_DIR = path.resolve(process.cwd(), ".exports");

async function ensureDir(): Promise<void> {
  await mkdir(EXPORTS_DIR, { recursive: true });
}

export async function writeExportFile(fileName: string, content: string): Promise<string> {
  await ensureDir();
  const filePath = path.join(EXPORTS_DIR, fileName);
  await writeFile(filePath, content, "utf8");
  return filePath;
}

export async function readExportFile(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

export async function deleteExportFile(filePath: string): Promise<void> {
  await unlink(filePath).catch(() => undefined);
}
