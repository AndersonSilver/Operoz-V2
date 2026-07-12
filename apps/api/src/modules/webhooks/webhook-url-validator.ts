import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ApiError } from "../../common/api-error.js";

/**
 * Anti-SSRF: bloqueia webhooks apontando para IPs privados/loopback/
 * link-local (inclusive o endpoint de metadata de cloud, 169.254.169.254)
 * e para o próprio host da plataforma. Roda tanto no create quanto no
 * update — o original tinha um bug onde essa checagem só rodava no
 * create, não replicado aqui.
 */
function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    return lower === "::1" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd");
  }
  return true; // não resolveu para um IP válido — trata como não confiável
}

export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ApiError(422, "invalid_webhook_url", "URL inválida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiError(422, "invalid_webhook_url", "Apenas URLs http/https são permitidas.");
  }
  if (!url.hostname) {
    throw new ApiError(422, "invalid_webhook_url", "URL sem hostname válido.");
  }

  const platformHosts = new Set(["localhost", "127.0.0.1"]);
  if (platformHosts.has(url.hostname)) {
    throw new ApiError(422, "invalid_webhook_url", "A URL não pode apontar para a própria plataforma.");
  }

  try {
    const { address } = await lookup(url.hostname);
    if (isPrivateOrReservedIp(address)) {
      throw new ApiError(422, "invalid_webhook_url", "A URL resolve para um endereço de rede privado/reservado, não permitido.");
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(422, "invalid_webhook_url", "Não foi possível resolver o hostname da URL.");
  }
}
