export interface Period {
  start: string;
  end: string;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Semana ISO (segunda a domingo, UTC) contendo `reference`. */
function isoWeekContaining(reference: Date): Period {
  const day = reference.getUTCDay(); // 0=domingo..6=sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() + diffToMonday));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function currentWeekPeriod(now: Date = new Date()): Period {
  return isoWeekContaining(now);
}

export function previousWeekPeriod(now: Date = new Date()): Period {
  const current = isoWeekContaining(now);
  const prevRef = new Date(current.start + "T00:00:00.000Z");
  prevRef.setUTCDate(prevRef.getUTCDate() - 1);
  return isoWeekContaining(prevRef);
}

export function lastNWeekPeriods(n: number, now: Date = new Date()): Period[] {
  const periods: Period[] = [];
  let cursor = currentWeekPeriod(now);
  for (let i = 0; i < n; i++) {
    periods.push(cursor);
    const prevRef = new Date(cursor.start + "T00:00:00.000Z");
    prevRef.setUTCDate(prevRef.getUTCDate() - 1);
    cursor = isoWeekContaining(prevRef);
  }
  return periods;
}
