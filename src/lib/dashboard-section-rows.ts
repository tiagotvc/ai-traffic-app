import type { DashboardSectionKey } from "@/lib/dashboard-layout-prefs";

export type DashboardSectionRowId = "chartAge" | "funnelObjectives" | "profitAdLibrary";

export type DashboardSectionRowLayout = "sideBySide" | "stacked";

export type DashboardSectionRowLayouts = Record<DashboardSectionRowId, DashboardSectionRowLayout>;

export const DASHBOARD_SECTION_ROW_IDS: DashboardSectionRowId[] = [
  "chartAge",
  "funnelObjectives",
  "profitAdLibrary"
];

export const DASHBOARD_SECTION_PAIRS: Array<{
  id: DashboardSectionRowId;
  sections: [DashboardSectionKey, DashboardSectionKey];
}> = [
  { id: "chartAge", sections: ["chart", "ageBreakdown"] },
  { id: "funnelObjectives", sections: ["funnel", "campaignObjectives"] },
  { id: "profitAdLibrary", sections: ["profitByCampaign", "adLibrary"] }
];

export const DEFAULT_DASHBOARD_SECTION_ROW_LAYOUTS: DashboardSectionRowLayouts = {
  chartAge: "sideBySide",
  funnelObjectives: "sideBySide",
  profitAdLibrary: "sideBySide"
};

export function normalizeSectionRowLayouts(raw: unknown): DashboardSectionRowLayouts {
  const result = { ...DEFAULT_DASHBOARD_SECTION_ROW_LAYOUTS };
  if (!raw || typeof raw !== "object") return result;
  for (const id of DASHBOARD_SECTION_ROW_IDS) {
    const value = (raw as Record<string, unknown>)[id];
    if (value === "sideBySide" || value === "stacked") result[id] = value;
  }
  return result;
}

export function findRowIdForAdjacentPair(
  a: DashboardSectionKey,
  b: DashboardSectionKey
): DashboardSectionRowId | null {
  for (const pair of DASHBOARD_SECTION_PAIRS) {
    const [left, right] = pair.sections;
    if ((a === left && b === right) || (a === right && b === left)) return pair.id;
  }
  return null;
}

export function getRowIdForSection(key: DashboardSectionKey): DashboardSectionRowId | null {
  for (const pair of DASHBOARD_SECTION_PAIRS) {
    if (pair.sections[0] === key || pair.sections[1] === key) return pair.id;
  }
  return null;
}

/** First section of a pair in the customize list — hosts the row layout control. */
export function isRowLayoutControlAnchor(
  key: DashboardSectionKey,
  orderedSections: DashboardSectionKey[]
): boolean {
  const rowId = getRowIdForSection(key);
  if (!rowId) return false;
  const pair = DASHBOARD_SECTION_PAIRS.find((item) => item.id === rowId);
  if (!pair) return false;
  const firstInOrder = orderedSections.find((sectionKey) => pair.sections.includes(sectionKey));
  return firstInOrder === key;
}

export type DashboardSectionRenderGroup =
  | { type: "single"; key: DashboardSectionKey }
  | {
      type: "row";
      rowId: DashboardSectionRowId;
      keys: [DashboardSectionKey, DashboardSectionKey];
      layout: DashboardSectionRowLayout;
    };

export function buildDashboardSectionGroups(
  visibleOrder: DashboardSectionKey[],
  rowLayouts: DashboardSectionRowLayouts
): DashboardSectionRenderGroup[] {
  const groups: DashboardSectionRenderGroup[] = [];
  let index = 0;

  while (index < visibleOrder.length) {
    const key = visibleOrder[index]!;
    const nextKey = visibleOrder[index + 1];

    if (nextKey) {
      const rowId = findRowIdForAdjacentPair(key, nextKey);
      if (rowId && rowLayouts[rowId] === "sideBySide") {
        groups.push({
          type: "row",
          rowId,
          keys: [key, nextKey],
          layout: "sideBySide"
        });
        index += 2;
        continue;
      }
    }

    groups.push({ type: "single", key });
    index += 1;
  }

  return groups;
}
