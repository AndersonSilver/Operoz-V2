const IDENTIFIER_PATTERN = /^[A-Z0-9]+$/;

export function normalizeIdentifier(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidIdentifier(identifier: string): boolean {
  return identifier.length >= 1 && identifier.length <= 12 && IDENTIFIER_PATTERN.test(identifier);
}

const PROJECT_ICON_PALETTE = [
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
];

export function randomLogoProps(): Record<string, unknown> {
  const color = PROJECT_ICON_PALETTE[Math.floor(Math.random() * PROJECT_ICON_PALETTE.length)]!;
  return { in_use: "icon", icon: { color, background_color: color } };
}
