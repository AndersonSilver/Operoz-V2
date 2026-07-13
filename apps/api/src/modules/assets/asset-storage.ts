import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

/** Mesmo padrão de `exports/export-storage.ts`: disco local em vez de S3/MinIO. */
const ASSETS_DIR = path.resolve(process.cwd(), ".assets");

async function ensureDir(): Promise<void> {
  await mkdir(ASSETS_DIR, { recursive: true });
}

export async function writeAssetFile(buffer: Buffer): Promise<string> {
  await ensureDir();
  const storageKey = randomUUID();
  await writeFile(path.join(ASSETS_DIR, storageKey), buffer);
  return storageKey;
}

export async function readAssetFile(storageKey: string): Promise<Buffer> {
  return readFile(path.join(ASSETS_DIR, storageKey));
}

export async function deleteAssetFile(storageKey: string): Promise<void> {
  await unlink(path.join(ASSETS_DIR, storageKey)).catch(() => undefined);
}
