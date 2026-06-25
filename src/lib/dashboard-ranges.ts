import type { PeriodState } from "@/components/PeriodFilter";
import { addDaysIso, normalizeDayKey, startOfMonthIso, startOfQuarterIso, startOfWeekIso, todayIso } from "@/lib/report-period";

export type Range = { since: string; until: string };

export function pctDelta(cur: number, prev: number): number | null {
  if (!prev || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
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
