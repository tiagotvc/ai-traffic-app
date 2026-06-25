import type { PeriodState } from "@/components/PeriodFilter";
import {
  addDaysIso,
  rollingDaysEndingYesterday,
  startOfMonthIso,
  startOfQuarterIso,
  startOfWeekIso,
  todayIso,
  type PeriodPreset
} from "@/lib/report-period";

/** Presets adicionais além do PeriodPreset base. */
export type ExtendedPeriodPreset =
  | PeriodPreset
  | "last21"
  | "last60"
  | "last90"
  | "last180"
  | "last365"
  | "last730";

export const EXTENDED_PERIOD_GROUPS: Array<{
  labelKey: string;
  presets: ExtendedPeriodPreset[];
}> = [
  { labelKey: "periodGroupWeeks", presets: ["last7", "last14", "last21"] },
  { labelKey: "periodGroupMonths", presets: ["last30", "last60", "last90", "last180"] },
  { labelKey: "periodGroupYears", presets: ["last365", "last730"] },
  {
    labelKey: "periodGroupRelative",
    presets: ["thisWeek", "thisMonth", "thisQuarter"]
  }
];

export const ALL_EXTENDED_PERIOD_PRESETS: ExtendedPeriodPreset[] = EXTENDED_PERIOD_GROUPS.flatMap(
  (g) => g.presets
);

const ROLLING_DAYS: Partial<Record<ExtendedPeriodPreset, number>> = {
  last7: 7,
  last14: 14,
  last15: 15,
  last21: 21,
  last30: 30,
  last60: 60,
  last90: 90,
  last180: 180,
  last365: 365,
  last730: 730
};

export function isExtendedPeriodPreset(value: string): value is ExtendedPeriodPreset {
  return (
    ALL_EXTENDED_PERIOD_PRESETS.includes(value as ExtendedPeriodPreset) ||
    value === "today" ||
    value === "yesterday" ||
    value === "custom" ||
    value === "all"
  );
}

export function periodStateFromExtendedPreset(
  preset: ExtendedPeriodPreset,
  timeZone?: string
): PeriodState {
  const today = todayIso(timeZone);
  const rolling = ROLLING_DAYS[preset];
  if (rolling) {
    const { since, until } = rollingDaysEndingYesterday(rolling);
    return { preset: "custom", since, until };
  }
  if (preset === "thisWeek") {
    return { preset: "thisWeek", since: startOfWeekIso(timeZone), until: today };
  }
  if (preset === "thisMonth") {
    return { preset: "thisMonth", since: startOfMonthIso(timeZone), until: addDaysIso(today, -1) };
  }
  if (preset === "thisQuarter") {
    return { preset: "thisQuarter", since: startOfQuarterIso(timeZone), until: addDaysIso(today, -1) };
  }
  if (preset === "today") {
    return { preset: "today", since: today, until: today };
  }
  if (preset === "yesterday") {
    const y = addDaysIso(today, -1);
    return { preset: "yesterday", since: y, until: y };
  }
  if (preset === "custom" || preset === "all") {
    return { preset, since: "", until: "" };
  }
  const { since, until } = rollingDaysEndingYesterday(7);
  return { preset: "custom", since, until };
}
