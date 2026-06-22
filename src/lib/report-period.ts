export type PeriodPreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "thisQuarter"
  | "last7"
  | "last14"
  | "last15"
  | "last30"
  | "custom"
  | "all";

export type ParsedPeriod = {
  preset: PeriodPreset;
  since: string | null;
  until: string | null;
  /** Legacy compat for dashboard */
  days: number | null;
  allTime: boolean;
};

/**
 * Fuso padrão usado para resolver "hoje"/períodos relativos.
 * Idealmente seria o fuso configurado na conta de anúncios (a Meta agrega as
 * insights pelo timezone da conta). Como ainda não sincronizamos esse campo,
 * usamos um padrão configurável por env (default: Brasil), evitando que o
 * "hoje" seja calculado no fuso do servidor (UTC na Vercel).
 */
export const DEFAULT_REPORT_TZ =
  (typeof process !== "undefined" && process.env?.REPORT_TIMEZONE?.trim()) || "America/Sao_Paulo";

/** Data (YYYY-MM-DD) no fuso informado. en-CA produz o formato ISO de data. */
function localDateIso(date = new Date(), timeZone = DEFAULT_REPORT_TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/** Soma/subtrai dias a uma data ISO ancorando ao meio-dia UTC (evita borda de DST). */
export function addDaysIso(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12) + delta * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

function daysAgoIso(n: number, timeZone = DEFAULT_REPORT_TZ) {
  return addDaysIso(localDateIso(new Date(), timeZone), -n);
}

/** Meta "últimos N dias" não inclui hoje — intervalo fecha em ontem. */
export function todayIso(timeZone = DEFAULT_REPORT_TZ) {
  return localDateIso(new Date(), timeZone);
}

export function yesterdayIso() {
  return daysAgoIso(1);
}

export function rollingDaysEndingYesterday(days: number) {
  return {
    since: daysAgoIso(days),
    until: daysAgoIso(1)
  };
}

/** Início da semana (segunda-feira) no fuso configurado. */
export function startOfWeekIso(timeZone = DEFAULT_REPORT_TZ) {
  const today = todayIso(timeZone);
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0=domingo .. 6=sábado
  const backToMonday = (dow + 6) % 7;
  return addDaysIso(today, -backToMonday);
}

/** Esta semana: de segunda-feira até hoje (inclusive). */
export function thisWeekRange(timeZone = DEFAULT_REPORT_TZ) {
  const since = startOfWeekIso(timeZone);
  const until = todayIso(timeZone);
  const days =
    Math.round((Date.parse(until) - Date.parse(since)) / 86_400_000) + 1;
  return { since, until, days };
}

export function startOfMonthIso(timeZone = DEFAULT_REPORT_TZ) {
  const today = todayIso(timeZone);
  return `${today.slice(0, 7)}-01`;
}

export function startOfQuarterIso(timeZone = DEFAULT_REPORT_TZ) {
  const today = todayIso(timeZone);
  const month = Number(today.slice(5, 7));
  const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return `${today.slice(0, 4)}-${String(quarterStartMonth).padStart(2, "0")}-01`;
}

/** Este mês: do dia 1 até ontem (padrão Meta). */
export function thisMonthRange(timeZone = DEFAULT_REPORT_TZ) {
  const since = startOfMonthIso(timeZone);
  const until = yesterdayIso();
  const days = Math.max(1, Math.round((Date.parse(until) - Date.parse(since)) / 86_400_000) + 1);
  return { since, until, days };
}

/** Trimestre atual: do 1º dia do trimestre até ontem. */
export function thisQuarterRange(timeZone = DEFAULT_REPORT_TZ) {
  const since = startOfQuarterIso(timeZone);
  const until = yesterdayIso();
  const days = Math.max(1, Math.round((Date.parse(until) - Date.parse(since)) / 86_400_000) + 1);
  return { since, until, days };
}

export function parsePeriodFromSearchParams(url: URL): ParsedPeriod {
  const period = url.searchParams.get("period")?.trim() as PeriodPreset | undefined;
  const sinceParam = url.searchParams.get("since")?.trim();
  const untilParam = url.searchParams.get("until")?.trim();
  const daysRaw = Number(url.searchParams.get("days") ?? "");

  if (period === "all") {
    return { preset: "all", since: null, until: null, days: null, allTime: true };
  }

  if (period === "today") {
    const t = todayIso();
    return { preset: "today", since: t, until: t, days: 1, allTime: false };
  }

  if (period === "yesterday") {
    const y = yesterdayIso();
    return { preset: "yesterday", since: y, until: y, days: 1, allTime: false };
  }

  if (period === "thisWeek") {
    const r = thisWeekRange();
    return { preset: "thisWeek", since: r.since, until: r.until, days: r.days, allTime: false };
  }

  if (period === "thisMonth") {
    const r = thisMonthRange();
    return { preset: "thisMonth", since: r.since, until: r.until, days: r.days, allTime: false };
  }

  if (period === "thisQuarter") {
    const r = thisQuarterRange();
    return { preset: "thisQuarter", since: r.since, until: r.until, days: r.days, allTime: false };
  }

  if (period === "last15") {
    const range = rollingDaysEndingYesterday(15);
    return { preset: "last15", since: range.since, until: range.until, days: 15, allTime: false };
  }

  if (period === "custom" && sinceParam && untilParam) {
    const since = sinceParam.slice(0, 10);
    const until = untilParam.slice(0, 10);
    return { preset: "custom", since, until, days: null, allTime: false };
  }

  if (period === "last14") {
    const range = rollingDaysEndingYesterday(14);
    return {
      preset: "last14",
      since: range.since,
      until: range.until,
      days: 14,
      allTime: false
    };
  }

  if (period === "last30") {
    const range = rollingDaysEndingYesterday(30);
    return {
      preset: "last30",
      since: range.since,
      until: range.until,
      days: 30,
      allTime: false
    };
  }

  if (period === "last7") {
    const range = rollingDaysEndingYesterday(7);
    return {
      preset: "last7",
      since: range.since,
      until: range.until,
      days: 7,
      allTime: false
    };
  }

  if (Number.isFinite(daysRaw) && daysRaw >= 1) {
    const days = Math.min(90, Math.max(1, Math.floor(daysRaw)));
    const range = rollingDaysEndingYesterday(days);
    return {
      preset:
        days === 14
          ? "last14"
          : days === 15
            ? "last15"
            : days === 30
              ? "last30"
              : "last7",
      since: range.since,
      until: range.until,
      days,
      allTime: false
    };
  }

  const defaultRange = rollingDaysEndingYesterday(7);
  return {
    preset: "last7",
    since: defaultRange.since,
    until: defaultRange.until,
    days: 7,
    allTime: false
  };
}

/** Dias inclusivos entre since e until (YYYY-MM-DD). */
export function inclusivePeriodDays(since: string | null, until: string | null): number | null {
  if (!since || !until) return null;
  const days =
    Math.round((Date.parse(until.slice(0, 10)) - Date.parse(since.slice(0, 10))) / 86_400_000) + 1;
  return days > 0 ? days : null;
}

/** Resolve o tamanho do período para regras de ranking (ex.: volume mínimo de conversões). */
export function resolvedPeriodDays(period: ParsedPeriod): number | null {
  if (period.allTime) return null;
  if (period.days != null && period.days > 0) return period.days;
  return inclusivePeriodDays(period.since, period.until);
}

/** Normaliza dia vindo do banco/API para YYYY-MM-DD (aceita ISO datetime e Date). */
export function normalizeDayKey(day: unknown): string {
  if (day instanceof Date && !Number.isNaN(day.getTime())) {
    return day.toISOString().slice(0, 10);
  }
  const trimmed = String(day ?? "").trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1]!;
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return trimmed;
}

export function periodToSearchParams(period: {
  preset: PeriodPreset;
  since?: string;
  until?: string;
}): URLSearchParams {
  const qs = new URLSearchParams();
  qs.set("period", period.preset);
  if (period.preset === "thisWeek") {
    // server recomputa a partir do preset (segunda → hoje)
    return qs;
  }
  if (period.preset === "thisMonth" || period.preset === "thisQuarter") {
    return qs;
  }
  if (period.preset === "custom" && period.since && period.until) {
    qs.set("since", period.since);
    qs.set("until", period.until);
  } else if (period.preset === "last7") {
    qs.set("days", "7");
  } else if (period.preset === "last14") {
    qs.set("days", "14");
  } else if (period.preset === "last15") {
    qs.set("days", "15");
  } else if (period.preset === "last30") {
    qs.set("days", "30");
  }
  return qs;
}

export function periodStateToParsed(state: {
  preset: PeriodPreset;
  since: string;
  until: string;
}): ParsedPeriod {
  if (state.preset === "thisMonth") {
    const r = thisMonthRange();
    return { preset: "thisMonth", since: r.since, until: r.until, days: r.days, allTime: false };
  }
  if (state.preset === "thisQuarter") {
    const r = thisQuarterRange();
    return { preset: "thisQuarter", since: r.since, until: r.until, days: r.days, allTime: false };
  }
  if (state.preset === "thisWeek") {
    const r = thisWeekRange();
    return { preset: "thisWeek", since: r.since, until: r.until, days: r.days, allTime: false };
  }
  return {
    preset: state.preset,
    since: state.preset === "custom" ? state.since || null : null,
    until: state.preset === "custom" ? state.until || null : null,
    days:
      state.preset === "last7"
        ? 7
        : state.preset === "last14"
          ? 14
          : state.preset === "last15"
            ? 15
            : state.preset === "last30"
              ? 30
              : state.preset === "today" || state.preset === "yesterday"
                ? 1
                : null,
    allTime: state.preset === "all"
  };
}

/** Converte período parseado para since/until usados nas insights da Meta. */
export function periodToMetaInsightsRange(period: ParsedPeriod): {
  since?: string | null;
  until?: string | null;
  datePreset?: string;
} {
  if (period.allTime) {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 2);
    return { since: since.toISOString().slice(0, 10), until: yesterdayIso() };
  }
  if (period.preset === "custom" && period.since && period.until) {
    return { since: period.since, until: period.until };
  }
  if (period.preset === "thisMonth") {
    const r = thisMonthRange();
    return { since: r.since, until: r.until };
  }
  if (period.preset === "thisQuarter") {
    const r = thisQuarterRange();
    return { since: r.since, until: r.until };
  }
  if (period.preset === "thisWeek") {
    const r = thisWeekRange();
    return { since: r.since, until: r.until };
  }
  const fallback = rollingDaysEndingYesterday(period.days ?? 7);
  return {
    since: period.since ?? fallback.since,
    until: period.until ?? fallback.until
  };
}

export function formatPeriodLabel(
  period: ParsedPeriod,
  locale: string,
  labels: {
    today: string;
    yesterday: string;
    thisWeek: string;
    thisMonth: string;
    thisQuarter: string;
    last7: string;
    last14: string;
    last15: string;
    last30: string;
    custom: string;
    all: string;
  }
): string {
  if (period.allTime) return labels.all;
  if (period.preset === "today") return labels.today;
  if (period.preset === "yesterday") return labels.yesterday;
  if (period.preset === "thisWeek") return labels.thisWeek;
  if (period.preset === "thisMonth") return labels.thisMonth;
  if (period.preset === "thisQuarter") return labels.thisQuarter;
  if (period.preset === "last7") return labels.last7;
  if (period.preset === "last14") return labels.last14;
  if (period.preset === "last15") return labels.last15;
  if (period.preset === "last30") return labels.last30;
  if (period.preset === "custom" && period.since && period.until) {
    const fmt = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" });
    try {
      return `${fmt.format(new Date(period.since))} → ${fmt.format(new Date(period.until))}`;
    } catch {
      return labels.custom;
    }
  }
  return labels.last7;
}
