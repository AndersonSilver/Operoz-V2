import type { BoardClient360HealthSettings } from "../../entities/board-client-360-health-settings.entity.js";
import type { Client360Health } from "../../entities/client-360-health-snapshot.entity.js";

export type ReportCoverage = "complete" | "n_a" | "partial" | "missing";

export interface HealthScoreResult {
  score: number;
  health: Client360Health;
  legacyHealth: Client360Health;
  alert: boolean;
  reportCoverage: ReportCoverage;
  reportScore: number;
  overdueScore: number;
  supportScore: number;
}

/** Cobertura de status report — módulos publicados / total, ou nível-projeto se sem módulos. */
export function computeReportScore(
  totalModules: number,
  publishedModuleCount: number,
  projectLevelPublished: boolean,
): { coverage: ReportCoverage; score: number } {
  if (totalModules > 0) {
    if (publishedModuleCount === totalModules) return { coverage: "complete", score: 100 };
    if (publishedModuleCount === 0) return { coverage: "missing", score: 0 };
    return { coverage: "partial", score: Math.max(Math.round((100 * publishedModuleCount) / totalModules), 45) };
  }
  return projectLevelPublished ? { coverage: "complete", score: 100 } : { coverage: "n_a", score: 90 };
}

/** 0 atrasados→100; 1→80; 2→60; 3→40; 4→20; ≥5→0. */
export function computeOverdueScore(overdueCount: number): number {
  return Math.max(100 - overdueCount * 20, 0);
}

/**
 * Sem sustentação aberta→100; com atraso→clamp(25-overdue*10); 1 aberto sem
 * atraso→70; N abertos→clamp(70-(N-1)*15). Placeholder até o domínio
 * Intake/Support Queue existir: hoje sempre chamado com openCount=0
 * (nenhum chamado de sustentação rastreado ainda), então sempre 100 —
 * ver `client-360.service.ts`.
 */
export function computeSupportScore(openCount: number, overdueCount: number): number {
  if (openCount === 0) return 100;
  if (overdueCount > 0) return Math.max(25 - overdueCount * 10, 0);
  if (openCount === 1) return 70;
  return Math.max(70 - (openCount - 1) * 15, 0);
}

export function computeHealthScore(
  settings: Pick<
    BoardClient360HealthSettings,
    "weightReport" | "weightOverdue" | "weightSupport" | "thresholdOkMin" | "thresholdWarningMin" | "scoreAlertThreshold"
  >,
  input: {
    reportCoverage: ReportCoverage;
    reportScore: number;
    hasModules: boolean;
    overdueScore: number;
    overdueCount: number;
    supportScore: number;
    supportOpenCount: number;
    supportOverdueCount: number;
  },
): HealthScoreResult {
  const raw =
    (input.reportScore * settings.weightReport +
      input.overdueScore * settings.weightOverdue +
      input.supportScore * settings.weightSupport) /
    100;
  let score = Math.round(raw);

  // Caps de segurança pós-ponderação, alinhados ao semáforo legado.
  if (input.reportCoverage === "missing" && input.hasModules) score = Math.min(score, 40);
  if (input.overdueCount >= 5) score = Math.min(score, 35);
  if (input.supportOverdueCount > 0) score = Math.min(score, 35);
  score = Math.max(0, Math.min(100, score));

  const health: Client360Health =
    score >= settings.thresholdOkMin ? "ok" : score >= settings.thresholdWarningMin ? "warning" : "critical";

  const legacyHealth: Client360Health =
    (input.reportCoverage === "missing" && input.hasModules) ||
    input.overdueCount >= 5 ||
    input.supportOverdueCount > 0
      ? "critical"
      : input.overdueCount > 0 || input.reportCoverage === "partial" || input.supportOpenCount > 0
        ? "warning"
        : "ok";

  return {
    score,
    health,
    legacyHealth,
    alert: score < settings.scoreAlertThreshold,
    reportCoverage: input.reportCoverage,
    reportScore: input.reportScore,
    overdueScore: input.overdueScore,
    supportScore: input.supportScore,
  };
}
