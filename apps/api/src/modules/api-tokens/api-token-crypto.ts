import { createHash, randomBytes } from "node:crypto";

const TOKEN_PREFIX = "opz_";

export function generateApiTokenValue(): string {
  return `${TOKEN_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function hashApiToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function tokenDisplayPrefix(rawToken: string): string {
  return `${rawToken.slice(0, 12)}…`;
}
