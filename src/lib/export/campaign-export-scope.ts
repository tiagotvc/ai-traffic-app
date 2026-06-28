import type { CampaignPdfRow } from "@/lib/export/campaign-table-pdf";
import {
  EXPORT_SCOPE_TOP_N,
  type CampaignExportConfig,
  type CampaignExportFilters,
  type CampaignExportScope,
  type CampaignExportStatusFilter
} from "@/lib/export/campaign-export-types";

export const EXPORT_DRAFT_CATEGORY = "__draft__";

const PRESET_SHEET_ORDER = [
  "default",
  "lead_whatsapp",
  "lead_site",
  "sales",
  "reach"
] as const;

function isActive(row: CampaignPdfRow): boolean {
  return row.status === "ACTIVE";
}

function isPaused(row: CampaignPdfRow): boolean {
  return row.status === "PAUSED";
}

export function isDraftCampaignRow(row: CampaignPdfRow): boolean {
  return row.status === "DRAFT" || Boolean(row.isDraft);
}

export function campaignCategoryKey(row: CampaignPdfRow): string {
  if (isDraftCampaignRow(row)) return EXPORT_DRAFT_CATEGORY;
  return row.preset ?? "default";
}

function performanceScore(row: CampaignPdfRow): number {
  const spend = row.spend ?? 0;
  const roas = row.roas ?? 0;
  const conversions = row.conversions ?? 0;
  return spend * 0.4 + roas * spend * 0.0001 + conversions * 2;
}

export function applyCampaignExportScope(
  rows: CampaignPdfRow[],
  scope: CampaignExportScope,
  opts?: { customCampaignIds?: string[]; topN?: number }
): CampaignPdfRow[] {
  const topN = opts?.topN ?? EXPORT_SCOPE_TOP_N;
  const customIds = new Set(opts?.customCampaignIds ?? []);

  switch (scope) {
    case "active_only":
      return rows.filter(isActive);
    case "paused_only":
      return rows.filter(isPaused);
    case "best_roas":
      return [...rows].sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0)).slice(0, topN);
    case "best_spend":
      return [...rows].sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0)).slice(0, topN);
    case "top_performers":
      return [...rows]
        .sort((a, b) => performanceScore(b) - performanceScore(a))
        .slice(0, topN);
    case "custom":
      if (!customIds.size) return [];
      return rows.filter((r) => customIds.has(campaignRowId(r)));
    case "all":
    default:
      return rows;
  }
}

function rowMatchesStatus(row: CampaignPdfRow, statuses: CampaignExportStatusFilter[]): boolean {
  if (!statuses.length) return true;
  if (statuses.includes("DRAFT") && isDraftCampaignRow(row)) return true;
  if (statuses.includes("ACTIVE") && isActive(row)) return true;
  if (statuses.includes("PAUSED") && isPaused(row)) return true;
  return false;
}

export function applyCampaignExportFilters(
  rows: CampaignPdfRow[],
  filters?: CampaignExportFilters
): CampaignPdfRow[] {
  if (!filters) return rows;

  const statuses = filters.statuses ?? [];
  const clients = new Set(filters.clients ?? []);
  const presets = new Set(filters.presets ?? []);

  return rows.filter((row) => {
    if (statuses.length && !rowMatchesStatus(row, statuses)) return false;
    if (clients.size && !clients.has(row.clientName)) return false;
    if (presets.size && !presets.has(campaignCategoryKey(row))) return false;
    return true;
  });
}

export function resolveExportRows(
  rows: CampaignPdfRow[],
  config: Pick<CampaignExportConfig, "scope" | "customCampaignIds" | "topN" | "filters">
): CampaignPdfRow[] {
  const scoped = applyCampaignExportScope(rows, config.scope, {
    customCampaignIds: config.customCampaignIds,
    topN: config.topN
  });
  return applyCampaignExportFilters(scoped, config.filters);
}

export function campaignRowId(row: CampaignPdfRow & { metaCampaignId?: string }): string {
  return row.metaCampaignId ?? row.campaignName;
}

export function uniqueExportClients(rows: CampaignPdfRow[]): string[] {
  return [...new Set(rows.map((r) => r.clientName).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export function uniqueExportPresets(rows: CampaignPdfRow[]): string[] {
  const keys = new Set(rows.map(campaignCategoryKey));
  const ordered: string[] = PRESET_SHEET_ORDER.filter((key) => keys.has(key));
  const custom = [...keys]
    .filter((key) => key.startsWith("custom:"))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  if (keys.has(EXPORT_DRAFT_CATEGORY)) ordered.push(EXPORT_DRAFT_CATEGORY);
  return [...ordered, ...custom];
}

export type CampaignExportCategoryGroup = {
  key: string;
  rows: CampaignPdfRow[];
};

export function groupCampaignRowsByCategory(rows: CampaignPdfRow[]): CampaignExportCategoryGroup[] {
  const map = new Map<string, CampaignPdfRow[]>();
  for (const row of rows) {
    const key = campaignCategoryKey(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const groups: CampaignExportCategoryGroup[] = [];
  for (const key of PRESET_SHEET_ORDER) {
    const bucket = map.get(key);
    if (bucket?.length) groups.push({ key, rows: bucket });
  }

  const customKeys = [...map.keys()]
    .filter((key) => key.startsWith("custom:"))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  for (const key of customKeys) {
    groups.push({ key, rows: map.get(key)! });
  }

  const draftRows = map.get(EXPORT_DRAFT_CATEGORY);
  if (draftRows?.length) {
    groups.push({ key: EXPORT_DRAFT_CATEGORY, rows: draftRows });
  }

  return groups;
}

export function sanitizeExcelSheetName(name: string): string {
  const cleaned = name.replace(/[\\/*?:\[\]]/g, " ").trim();
  return (cleaned || "Sheet").slice(0, 31);
}
