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

export function serializeBreakdownLayout(layout: ReportBreakdownLayoutItem[]): string {
  return encodeURIComponent(JSON.stringify(layout));
}

export function parseBreakdownLayoutParam(raw: string | null | undefined): ReportBreakdownLayoutItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ReportBreakdownLayoutItem =>
        typeof item === "object" &&
        item != null &&
        typeof (item as ReportBreakdownLayoutItem).id === "string" &&
        ["gender", "age", "device"].includes((item as ReportBreakdownLayoutItem).id) &&
        typeof (item as ReportBreakdownLayoutItem).x === "number" &&
        typeof (item as ReportBreakdownLayoutItem).y === "number" &&
        typeof (item as ReportBreakdownLayoutItem).w === "number" &&
        typeof (item as ReportBreakdownLayoutItem).h === "number"
    );
  } catch {
    return [];
  }
}

export const BREAKDOWN_GRID_ROW_HEIGHT = 52;
export const BREAKDOWN_GRID_COLS = 12;

const CARD_CHROME_PX = 56;
const CHART_PER_ROW_PX = 26;
const TABLE_HEADER_PX = 28;
const TABLE_PER_ROW_PX = 24;
const CARD_PADDING_PX = 20;

/** Altura em px estimada para caber gráfico + tabela sem scroll interno. */
export function estimateBreakdownCardHeightPx(rowCount: number): number {
  const rows = Math.max(1, rowCount);
  const chartPx = rows * CHART_PER_ROW_PX + 12;
  const tablePx = TABLE_HEADER_PX + rows * TABLE_PER_ROW_PX;
  return CARD_CHROME_PX + chartPx + tablePx + CARD_PADDING_PX;
}

export function estimateBreakdownCardGridH(rowCount: number): number {
  return Math.max(3, Math.ceil(estimateBreakdownCardHeightPx(rowCount) / BREAKDOWN_GRID_ROW_HEIGHT));
}

function rectsOverlap(a: ReportBreakdownLayoutItem, b: ReportBreakdownLayoutItem): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Reposiciona Y para evitar sobreposição após ajuste de altura. */
export function reflowBreakdownLayoutY(layout: ReportBreakdownLayoutItem[]): ReportBreakdownLayoutItem[] {
  const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: ReportBreakdownLayoutItem[] = [];

  for (const item of sorted) {
    let y = item.y;
    let guard = 0;
    while (placed.some((p) => rectsOverlap(p, { ...item, y })) && guard < 48) {
      y++;
      guard++;
    }
    placed.push({ ...item, y });
  }

  return placed;
}

export function layoutWithFittedHeights(
  sections: Array<{ type: ReportBreakdownType; rows: unknown[] }>,
  layout: ReportBreakdownLayoutItem[]
): ReportBreakdownLayoutItem[] {
  return layout.map((item) => {
    const section = sections.find((s) => s.type === item.id);
    const rowCount = section?.rows.length ?? 1;
    return { ...item, h: estimateBreakdownCardGridH(rowCount) };
  });
}

/** Ajusta altura ao conteúdo e reflow vertical — sem barras de rolagem nos cards. */
export function fitBreakdownLayoutToContent(
  sections: Array<{ type: ReportBreakdownType; rows: unknown[] }>,
  layout: ReportBreakdownLayoutItem[]
): ReportBreakdownLayoutItem[] {
  return reflowBreakdownLayoutY(layoutWithFittedHeights(sections, layout));
}
