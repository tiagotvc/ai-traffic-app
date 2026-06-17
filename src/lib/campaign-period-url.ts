import type { PeriodState } from "@/components/PeriodFilter";
import { parsePeriodFromSearchParams, periodToSearchParams } from "@/lib/report-period";

function periodStateFromParsed(p: ReturnType<typeof parsePeriodFromSearchParams>): PeriodState {
  return {
    preset: p.preset,
    since: p.since ?? "",
    until: p.until ?? ""
  };
}

export function periodStateFromQueryString(periodQuery: string): PeriodState {
  const raw = periodQuery.startsWith("?") ? periodQuery.slice(1) : periodQuery;
  const url = new URL("http://local");
  if (raw) {
    new URLSearchParams(raw).forEach((v, k) => url.searchParams.set(k, v));
  }
  return periodStateFromParsed(parsePeriodFromSearchParams(url));
}

export function buildPeriodQueryFromParams(
  sp: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  if (sp.period) params.set("period", sp.period);
  if (sp.since) params.set("since", sp.since);
  if (sp.until) params.set("until", sp.until);
  if (sp.days) params.set("days", sp.days);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function appendPeriodToQuery(base: URLSearchParams, period: PeriodState): URLSearchParams {
  const periodQs = periodToSearchParams(period);
  periodQs.forEach((v, k) => base.set(k, v));
  return base;
}
