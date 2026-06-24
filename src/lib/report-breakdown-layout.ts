import type { ReportBreakdownType } from "@/lib/report-breakdown-data";

export type ReportBreakdownLayoutItem = {
  id: ReportBreakdownType;
  x: number;
  y: number;
  w: number;
  h: number;
};

const STORAGE_KEY = "orion-report-breakdown-layout";

const DEFAULT_BY_TYPE: Record<ReportBreakdownType, Omit<ReportBreakdownLayoutItem, "id">> = {
  gender: { x: 0, y: 0, w: 4, h: 4 },
  age: { x: 4, y: 0, w: 4, h: 5 },
  device: { x: 8, y: 0, w: 4, h: 4 }
};

export function defaultBreakdownLayout(types: ReportBreakdownType[]): ReportBreakdownLayoutItem[] {
  return types.map((type, index) => {
    const preset = DEFAULT_BY_TYPE[type];
    if (preset) return { id: type, ...preset };
    return { id: type, x: 0, y: index * 4, w: 12, h: 4 };
  });
}

export function loadReportBreakdownLayout(): ReportBreakdownLayoutItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ReportBreakdownLayoutItem =>
        typeof item === "object" &&
        item != null &&
        typeof (item as ReportBreakdownLayoutItem).id === "string" &&
        ["gender", "age", "device"].includes((item as ReportBreakdownLayoutItem).id)
    );
  } catch {
    return [];
  }
}

export function saveReportBreakdownLayout(layout: ReportBreakdownLayoutItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export function mergeBreakdownLayout(
  types: ReportBreakdownType[],
  saved: ReportBreakdownLayoutItem[]
): ReportBreakdownLayoutItem[] {
  const typeSet = new Set(types);
  const kept = saved.filter((item) => typeSet.has(item.id));
  const missing = types.filter((type) => !kept.some((item) => item.id === type));
  return [...kept, ...defaultBreakdownLayout(missing)];
}
