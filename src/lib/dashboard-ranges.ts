import type { PeriodState } from "@/components/PeriodFilter";
import { addDaysIso, normalizeDayKey, startOfMonthIso, startOfQuarterIso, startOfWeekIso, todayIso } from "@/lib/report-period";

export type Range = { since: string; until: string };

export function pctDelta(cur: number, prev: number): number | null {
  if (!Number.isFinite(prev) || !Number.isFinite(cur)) return null;
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

export const MAX_DELTA_PCT = 999.9;

export type MetricDeltaResult =
  | { kind: "pct"; value: number }
  | { kind: "new" }
  | { kind: "none" };

type SummaryLike = Partial<Record<string, number>>;

/** True when the previous period has enough activity to compare against. */
export function prevPeriodHasBaseline(prev: SummaryLike | null | undefined): boolean {
  if (!prev) return false;
  return (
    (prev.spend ?? 0) > 0 ||
    (prev.impressions ?? 0) > 0 ||
    (prev.clicks ?? 0) > 0
  );
}

/** Percent change vs previous period with sane caps for tiny baselines. */
export function formatDeltaPct(cur: number, prev: number | null | undefined): number | null {
  if (prev == null || !Number.isFinite(prev)) return null;
  if (cur <= 0 && prev <= 0) return 0;
  if (prev <= 0) return null;

  const absPrev = Math.abs(prev);
  const absCur = Math.abs(cur);
  const minBaseline = Math.max(absCur * 0.05, 1e-4);
  if (absPrev < minBaseline) return null;

  const delta = pctDelta(cur, prev);
  if (delta === null) return null;
  if (delta > MAX_DELTA_PCT) return MAX_DELTA_PCT;
  if (delta < -MAX_DELTA_PCT) return -MAX_DELTA_PCT;
  return delta;
}

/** Resolve period-over-period delta with explicit handling for zero baselines. */
export function resolveMetricDelta(
  cur: number,
  prev: number | null | undefined,
  opts?: { allowNew?: boolean }
): MetricDeltaResult {
  if (prev == null || !Number.isFinite(prev) || !Number.isFinite(cur)) {
    return { kind: "none" };
  }
  if (prev <= 0 && cur <= 0) return { kind: "none" };
  if (prev <= 0 && cur > 0) {
    return opts?.allowNew === false ? { kind: "none" } : { kind: "new" };
  }

  const delta = formatDeltaPct(cur, prev);
  if (delta !== null) return { kind: "pct", value: delta };
  return { kind: "none" };
}

/** Rótulo de data do eixo: dia/mês (padrão BR), ou mês/dia em inglês. */
export function formatDayLabel(day: string, locale: string): string {
  const iso = normalizeDayKey(day);
  const t = Date.parse(`${iso}T12:00:00Z`);
  if (Number.isNaN(t)) return String(day);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(t));
}

/** Resolve a janela atual e a janela equivalente anterior (para o delta). */
export function resolveRanges(
  p: PeriodState,
  timeZone?: string
): { current: Range | null; previous: Range | null } {
  if (p.preset === "all") return { current: null, previous: null };
  const today = todayIso(timeZone);
  let since: string;
  let until: string;
  if (p.preset === "today") {
    since = today;
    until = today;
  } else if (p.preset === "yesterday") {
    since = addDaysIso(today, -1);
    until = since;
  } else if (p.preset === "thisWeek") {
    since = startOfWeekIso(timeZone);
    until = today;
  } else if (p.preset === "thisMonth") {
    since = startOfMonthIso(timeZone);
    until = addDaysIso(today, -1);
  } else if (p.preset === "thisQuarter") {
    since = startOfQuarterIso(timeZone);
    until = addDaysIso(today, -1);
  } else if (p.preset === "custom" && p.since && p.until) {
    since = p.since;
    until = p.until;
  } else {
    const n = p.preset === "last7" ? 7 : p.preset === "last14" ? 14 : p.preset === "last15" ? 15 : 30;
    since = addDaysIso(today, -n);
    until = addDaysIso(today, -1);
  }
  const len = Math.round((Date.parse(until) - Date.parse(since)) / 86_400_000) + 1;
  const prevUntil = addDaysIso(since, -1);
  const prevSince = addDaysIso(prevUntil, -(len - 1));
  return { current: { since, until }, previous: { since: prevSince, until: prevUntil } };
}

export function buildQuery(clientId: string, accountId: string, range: Range | null) {
  const p = new URLSearchParams();
  if (clientId) p.set("clientId", clientId);
  if (accountId) p.set("adAccountId", accountId);
  if (range) {
    p.set("period", "custom");
    p.set("since", range.since);
    p.set("until", range.until);
  } else {
    p.set("period", "all");
  }
  return p.toString();
}
