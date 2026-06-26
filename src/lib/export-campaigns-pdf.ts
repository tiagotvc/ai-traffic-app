"use client";

import {
  resolveColumnNumericValue,
  type TableColumnRef
} from "@/lib/campaign-table-layout";
import { campaignPresetCode } from "@/lib/campaign-table-premium";
import { PDF_CAPTURE_WIDTH_PX } from "@/lib/export-report-pdf";
import { formatBRL, formatPercent, formatRoas } from "@/lib/format";
import { formatMetricValue, METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import { evaluateFormula } from "@/lib/metric-formula";
import { META_ACTION_CATALOG } from "@/lib/meta-metrics-catalog";

type Html2PdfOptions = {
  margin?: number | number[];
  filename?: string;
  image?: { type?: string; quality?: number };
  html2canvas?: Record<string, unknown>;
  jsPDF?: { unit?: string; format?: string | number[]; orientation?: string };
};

type Html2PdfWorker = {
  set: (opt: Html2PdfOptions) => Html2PdfWorker;
  from: (element: HTMLElement) => Html2PdfWorker;
  save: () => Promise<void>;
};

type Html2PdfFn = () => Html2PdfWorker;

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

function statusText(status: string | undefined, locale: string): string {
  const en = locale.startsWith("en");
  if (status === "ACTIVE") return en ? "Active" : "Ativo";
  if (status === "PAUSED") return en ? "Paused" : "Pausado";
  return en ? "Inactive" : "Inativo";
}

function columnLabel(col: TableColumnRef, customNames: Record<string, string>): string {
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

function buildExportHost(
  groupLabel: string,
  headers: string[],
  tableRows: string[][],
  locale: string
): HTMLDivElement {
  const host = document.createElement("div");
  host.setAttribute("data-campaign-pdf-export", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${PDF_CAPTURE_WIDTH_PX}px`,
    minHeight: "1px",
    zIndex: "2147483646",
    background: "#ffffff",
    color: "#0f172a",
    padding: "24px",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
    boxSizing: "border-box",
    pointerEvents: "none"
  } as CSSStyleDeclaration);

  const title = document.createElement("h1");
  title.textContent = groupLabel;
  Object.assign(title.style, {
    fontSize: "18px",
    fontWeight: "700",
    margin: "0 0 4px",
    color: "#0f172a"
  } as CSSStyleDeclaration);
  host.appendChild(title);

  const meta = document.createElement("p");
  const countLabel = locale.startsWith("en")
    ? `${tableRows.length} campaign(s)`
    : `${tableRows.length} campanha(s)`;
  meta.textContent = `${countLabel} · ${new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date())}`;
  Object.assign(meta.style, {
    fontSize: "11px",
    color: "#64748b",
    margin: "0 0 16px"
  } as CSSStyleDeclaration);
  host.appendChild(meta);

  const table = document.createElement("table");
  Object.assign(table.style, {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "11px",
    color: "#0f172a"
  } as CSSStyleDeclaration);

  const thead = document.createElement("thead");
  const headTr = document.createElement("tr");
  for (const h of headers) {
    const th = document.createElement("th");
    th.textContent = h;
    Object.assign(th.style, {
      textAlign: "left",
      padding: "8px 6px",
      borderBottom: "2px solid #e2e8f0",
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "#64748b",
      background: "#ffffff"
    } as CSSStyleDeclaration);
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
      Object.assign(td.style, {
        padding: "7px 6px",
        borderBottom: "1px solid #f1f5f9",
        verticalAlign: "top",
        color: "#0f172a",
        background: "#ffffff",
        fontWeight: i === 0 ? "600" : "400",
        textAlign: i >= 4 ? "right" : "left"
      } as CSSStyleDeclaration);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  host.appendChild(table);

  return host;
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
  if (!rows.length) return;

  const customNames = Object.fromEntries(
    Object.entries(customMetrics).map(([id, m]) => [id, m.name])
  );

  const headers = locale.startsWith("en")
    ? ["Campaign", "Client", "Status", "Type", ...metricColumns.map((c) => columnLabel(c, customNames))]
    : [
        "Campanha",
        "Cliente",
        "Status",
        "Tipo",
        ...metricColumns.map((c) => columnLabel(c, customNames))
      ];

  const tableRows = rows.map((row) => {
    const tipo = campaignPresetCode(row.preset);
    const metrics = metricColumns.map((col) => cellValue(col, row, customMetrics, locale));
    return [row.campaignName, row.clientName, statusText(row.status, locale), tipo, ...metrics];
  });

  const host = buildExportHost(groupLabel, headers, tableRows, locale);
  document.body.appendChild(host);

  // Garante layout antes da captura (html2canvas falha com elemento fora da viewport).
  host.getBoundingClientRect();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  try {
    const mod = await import("html2pdf.js");
    const html2pdf = (mod.default ?? mod) as Html2PdfFn;

    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: PDF_CAPTURE_WIDTH_PX,
          windowWidth: PDF_CAPTURE_WIDTH_PX,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      })
      .from(host)
      .save();
  } finally {
    host.remove();
  }
}
