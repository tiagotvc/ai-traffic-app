"use client";

import {
  resolveColumnNumericValue,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import { campaignPresetCode } from "@/lib/campaign-table-premium";
import { exportElementToPdf } from "@/lib/export-report-pdf";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";
import { formatMetricValue, METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { evaluateFormula } from "@/lib/metric-formula";
import { META_ACTION_CATALOG } from "@/lib/meta-metrics-catalog";

type ExportRow = {
  campaignName: string;
  clientName: string;
  status?: string;
  preset?: string;
  spend: number;
  conversions: number;
  leads: number;
  roas: number;
  cpa: number | null;
  cpl: number | null;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  [key: string]: unknown;
};

function statusText(status?: string): string {
  if (status === "ACTIVE") return "Ativo";
  if (status === "PAUSED") return "Pausado";
  return "Inativo";
}

function columnLabel(
  col: TableColumnRef,
  customNames: Record<string, string>
): string {
  if (col.kind === "metric") return METRIC_BY_KEY[col.key]?.label ?? col.key;
  if (col.kind === "meta_action") {
    const known = META_ACTION_CATALOG.find((a) => a.actionType === col.actionType);
    return known?.label ?? col.actionType;
  }
  if (col.kind === "custom") return customNames[col.id] ?? col.id;
  return col.id;
}

function cellValue(
  col: TableColumnRef,
  row: ExportRow,
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>,
  locale: string
): string {
  const val = resolveColumnNumericValue(col, row, customMetrics, evaluateFormula);
  if (val == null) return "";
  if (col.kind === "metric") return formatMetricValue(col.key, val, locale);
  if (col.kind === "custom") {
    const fmt = customMetrics[col.id]?.format ?? "number";
    if (fmt === "currency") return formatBRL(val, locale);
    if (fmt === "percent") return formatPercent(val, 2, locale);
    if (fmt === "multiplier") return formatRoas(val, locale);
    return String(Math.round(val * 100) / 100);
  }
  return String(Math.round(val));
}

export async function exportCampaignGroupPdf({
  groupLabel,
  rows,
  metricColumns,
  customMetrics,
  filename,
  locale = typeof navigator !== "undefined" && navigator.language.startsWith("en") ? "en" : "pt-BR"
}: {
  groupLabel: string;
  rows: ExportRow[];
  metricColumns: TableColumnRef[];
  customMetrics: Record<string, { id: string; name: string; formula: string; format: string }>;
  filename: string;
  locale?: string;
}) {
  const customNames = Object.fromEntries(
    Object.entries(customMetrics).map(([id, m]) => [id, m.name])
  );

  const headers = [
    "Campanha",
    "Cliente",
    "Status",
    "Tipo",
    ...metricColumns.map((c) => columnLabel(c, customNames))
  ];

  const tableRows = rows.map((row) => {
    const tipo = campaignPresetCode(row.preset);
    const metrics = metricColumns.map((col) => cellValue(col, row, customMetrics, locale));
    return [row.campaignName, row.clientName, statusText(row.status), tipo, ...metrics];
  });

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-9999px";
  host.style.top = "0";
  host.style.background = "#fff";
  host.style.color = "#0f172a";
  host.style.padding = "24px";
  host.style.fontFamily = "system-ui, sans-serif";

  const title = document.createElement("h1");
  title.textContent = groupLabel;
  title.style.fontSize = "18px";
  title.style.fontWeight = "700";
  title.style.marginBottom = "4px";
  host.appendChild(title);

  const meta = document.createElement("p");
  meta.textContent = `${rows.length} campanha(s) · ${new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date())}`;
  meta.style.fontSize = "11px";
  meta.style.color = "#64748b";
  meta.style.marginBottom = "16px";
  host.appendChild(meta);

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "11px";

  const thead = document.createElement("thead");
  const headTr = document.createElement("tr");
  for (const h of headers) {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.textAlign = "left";
    th.style.padding = "8px 6px";
    th.style.borderBottom = "2px solid #e2e8f0";
    th.style.fontSize = "10px";
    th.style.textTransform = "uppercase";
    th.style.letterSpacing = "0.06em";
    th.style.color = "#64748b";
    headTr.appendChild(th);
  }
  thead.appendChild(headTr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const cells of tableRows) {
    const tr = document.createElement("tr");
    for (const [i, cell] of cells.entries()) {
      const td = document.createElement("td");
      td.textContent = cell;
      td.style.padding = "7px 6px";
      td.style.borderBottom = "1px solid #f1f5f9";
      td.style.verticalAlign = "top";
      if (i === 0) td.style.fontWeight = "600";
      if (i >= 4) td.style.textAlign = "right";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  host.appendChild(table);

  document.body.appendChild(host);
  try {
    await exportElementToPdf(host, filename);
  } finally {
    host.remove();
  }
}
