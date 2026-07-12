import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { env } from "../config/env.js";

/**
 * Criptografia simétrica (AES-256-GCM) para segredos em repouso
 * (tokens OAuth, credenciais de integrações). A documentação do sistema
 * anterior identificou tokens OAuth gravados em texto plano como um risco
 * real — aqui isso é resolvido por padrão, não como exceção.
 */
const KEY = scryptSync(env.SESSION_SECRET, "operoz-encryption-salt", 32);
const ALGORITHM = "aes-256-gcm";

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buffer = Buffer.from(payload, "base64");
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
