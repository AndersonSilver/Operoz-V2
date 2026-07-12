const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Slugs que colidiriam com rotas do próprio produto ou são reservados por
// convenção (marcas, termos ofensivos óbvios de bloquear na origem, etc.).
const RESTRICTED_SLUGS = new Set([
  "api",
  "app",
  "admin",
  "auth",
  "workspaces",
  "workspace-invitations",
  "projects",
  "users",
  "settings",
  "billing",
  "onboarding",
  "sign-in",
  "sign-up",
  "operoz",
  "www",
  "root",
  "null",
  "undefined",
]);

export function isValidSlugFormat(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 48 && SLUG_PATTERN.test(slug);
}

export function isRestrictedSlug(slug: string): boolean {
  return RESTRICTED_SLUGS.has(slug);
}

/** Libera o slug original para reuso quando o workspace é soft-deletado. */
export function mangleSlugForDelete(slug: string): string {
  return `${slug}__${Date.now()}`;
}

const PALETTE = [
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
  "#EF4444",
];

export function randomBackgroundColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
}
