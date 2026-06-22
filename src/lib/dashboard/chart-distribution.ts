import type { MetricKey } from "@/lib/dashboard-metrics";
import type { BoxPlotGroupBy } from "@/lib/dashboard/slot-visual-config";

type SeriesPoint = { day: string } & Partial<Record<MetricKey, number>>;

export type BoxPlotGroup = {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
};

export type ParetoRow = {
  label: string;
  value: number;
  cumulativePct: number;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function iqrBounds(q1: number, q3: number): { lower: number; upper: number } {
  const iqr = q3 - q1;
  return { lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
}

function groupLabelForDay(day: string, groupBy: BoxPlotGroupBy): string {
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  if (groupBy === "dayOfWeek") return DAY_NAMES[d.getDay()];
  if (groupBy === "client") return `Week ${Math.ceil(d.getDate() / 7)}`;
  return `Day ${d.getDate()}`;
}

export function toBoxPlotGroups(
  series: SeriesPoint[],
  groupBy: BoxPlotGroupBy,
  metric: MetricKey
): BoxPlotGroup[] {
  const buckets = new Map<string, number[]>();
  for (const point of series) {
    const value = point[metric];
    if (value == null || !Number.isFinite(value)) continue;
    const label = groupLabelForDay(point.day, groupBy);
    const arr = buckets.get(label) ?? [];
    arr.push(value);
    buckets.set(label, arr);
  }

  const groups: BoxPlotGroup[] = [];
  for (const [label, values] of buckets) {
    if (!values.length) continue;
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const median = quantile(sorted, 0.5);
    const q3 = quantile(sorted, 0.75);
    const { lower, upper } = iqrBounds(q1, q3);
    const inRange = sorted.filter((v) => v >= lower && v <= upper);
    const min = inRange.length ? Math.min(...inRange) : sorted[0];
    const max = inRange.length ? Math.max(...inRange) : sorted[sorted.length - 1];
    const outliers = sorted.filter((v) => v < lower || v > upper);
    groups.push({ label, min, q1, median, q3, max, outliers });
  }

  const order =
    groupBy === "dayOfWeek"
      ? DAY_NAMES
      : groups.map((g) => g.label).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return groups.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

export function toParetoRows(
  rows: Array<{ label: string; value: number }>,
  sortDescending = true
): ParetoRow[] {
  const sorted = [...rows].sort((a, b) => (sortDescending ? b.value - a.value : a.value - b.value));
  const total = sorted.reduce((sum, r) => sum + r.value, 0);
  if (total <= 0) return sorted.map((r) => ({ ...r, cumulativePct: 0 }));

  let cumulative = 0;
  return sorted.map((r) => {
    cumulative += r.value;
    return { ...r, cumulativePct: (cumulative / total) * 100 };
  });
}

export function toParetoFromSeries(
  series: SeriesPoint[],
  metric: MetricKey,
  sortDescending = true
): ParetoRow[] {
  const rows = series.map((p) => ({
    label: p.day.slice(5),
    value: p[metric] ?? 0
  }));
  return toParetoRows(rows.filter((r) => r.value > 0), sortDescending);
}
