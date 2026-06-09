export type PeriodPreset =
  | "today"
  | "yesterday"
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

/** Data local do navegador/servidor (evita “hoje” vazio por desvio UTC). */
function localDateIso(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysAgoIso(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateIso(d);
}

/** Meta "últimos N dias" não inclui hoje — intervalo fecha em ontem. */
export function todayIso() {
  return localDateIso();
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

export function periodToSearchParams(period: {
  preset: PeriodPreset;
  since?: string;
  until?: string;
}): URLSearchParams {
  const qs = new URLSearchParams();
  qs.set("period", period.preset);
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

export function formatPeriodLabel(
  period: ParsedPeriod,
  locale: string,
  labels: {
    today: string;
    yesterday: string;
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
