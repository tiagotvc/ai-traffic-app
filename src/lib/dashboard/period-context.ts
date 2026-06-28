import type { PeriodState } from "@/components/PeriodFilter";
import { formatDayLabel, resolveRanges } from "@/lib/dashboard-ranges";

export function buildDashboardPeriodContext(args: {
  period: PeriodState;
  timeZone?: string;
  locale: string;
  tPeriod: (key: string) => string;
  tDash: (key: string) => string;
}) {
  const { period, timeZone, locale, tPeriod, tDash } = args;
  const { current } = resolveRanges(period, timeZone);

  let periodLabel: string;
  if (period.preset === "custom" && current) {
    periodLabel = `${formatDayLabel(current.since, locale)} – ${formatDayLabel(current.until, locale)}`;
  } else if (period.preset === "all") {
    periodLabel = tPeriod("all");
  } else {
    periodLabel = tPeriod(period.preset);
  }

  const vsLabel = tDash("vsPrevPeriod");
  const deltaNewLabel = tDash("deltaNew");
  const chartSubtitle = `${periodLabel} · ${vsLabel}`;

  return { periodLabel, vsLabel, deltaNewLabel, chartSubtitle };
}
