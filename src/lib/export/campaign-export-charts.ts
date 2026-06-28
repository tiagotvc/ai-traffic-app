"use client";

import type { CampaignPdfRow } from "@/lib/export/campaign-table-pdf";
import type { CampaignExportChartKey } from "@/lib/export/campaign-export-types";

const CHART_W = 720;
const CHART_H = 320;
const PAD = { top: 36, right: 24, bottom: 48, left: 56 };

const VIOLET = "#7c3aed";
const VIOLET_LIGHT = "#a78bfa";
const SLATE = "#64748b";
const GRID = "#e2e8f0";
const TEXT = "#0f172a";

function truncateLabel(label: string, max = 14): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}

function topCampaignsBySpend(rows: CampaignPdfRow[], limit = 8): CampaignPdfRow[] {
  return [...rows].sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0)).slice(0, limit);
}

function topCampaignsByRoas(rows: CampaignPdfRow[], limit = 8): CampaignPdfRow[] {
  return [...rows]
    .filter((r) => (r.roas ?? 0) > 0)
    .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))
    .slice(0, limit);
}

function drawBaseChart(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CHART_W, CHART_H);

  ctx.fillStyle = TEXT;
  ctx.font = "600 16px system-ui, sans-serif";
  ctx.fillText(title, PAD.left, 24);

  ctx.fillStyle = SLATE;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(subtitle, PAD.left, 42);
}

function drawBarChart(
  canvas: HTMLCanvasElement,
  rows: CampaignPdfRow[],
  title: string,
  subtitle: string,
  valueKey: "spend" | "roas",
  barColor: string
): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  canvas.width = CHART_W;
  canvas.height = CHART_H;
  drawBaseChart(ctx, title, subtitle);

  if (!rows.length) {
    ctx.fillStyle = SLATE;
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("—", PAD.left, CHART_H / 2);
    return canvas.toDataURL("image/png");
  }

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const values = rows.map((r) => Math.max(0, valueKey === "spend" ? r.spend ?? 0 : r.roas ?? 0));
  const maxVal = Math.max(...values, 1);
  const barGap = 10;
  const barW = Math.max(18, (plotW - barGap * (rows.length - 1)) / rows.length);

  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + plotW, y);
    ctx.stroke();
  }

  rows.forEach((row, i) => {
    const val = values[i]!;
    const h = (val / maxVal) * plotH;
    const x = PAD.left + i * (barW + barGap);
    const y = PAD.top + plotH - h;

    ctx.fillStyle = barColor;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, barW, h, 4);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, barW, h);
    }

    ctx.fillStyle = SLATE;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(truncateLabel(row.campaignName), x + barW / 2, CHART_H - 18);
    ctx.textAlign = "left";
  });

  return canvas.toDataURL("image/png");
}

function drawLineChart(
  canvas: HTMLCanvasElement,
  rows: CampaignPdfRow[],
  title: string,
  subtitle: string
): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  canvas.width = CHART_W;
  canvas.height = CHART_H;
  drawBaseChart(ctx, title, subtitle);

  if (!rows.length) {
    ctx.fillStyle = SLATE;
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("—", PAD.left, CHART_H / 2);
    return canvas.toDataURL("image/png");
  }

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const values = rows.map((r) => Math.max(0, r.roas ?? 0));
  const maxVal = Math.max(...values, 0.1);
  const stepX = rows.length > 1 ? plotW / (rows.length - 1) : 0;

  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + plotW, y);
    ctx.stroke();
  }

  ctx.strokeStyle = VIOLET;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  rows.forEach((row, i) => {
    const x = PAD.left + stepX * i;
    const y = PAD.top + plotH - ((values[i] ?? 0) / maxVal) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  rows.forEach((row, i) => {
    const x = PAD.left + stepX * i;
    const y = PAD.top + plotH - ((values[i] ?? 0) / maxVal) * plotH;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = VIOLET;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = SLATE;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(truncateLabel(row.campaignName), x, CHART_H - 18);
    ctx.textAlign = "left";
  });

  return canvas.toDataURL("image/png");
}

export type RenderedCampaignChart = {
  key: CampaignExportChartKey;
  dataUrl: string;
  title: string;
};

export function renderCampaignExportCharts(input: {
  rows: CampaignPdfRow[];
  charts: CampaignExportChartKey[];
  labels: {
    spendBarTitle: string;
    spendBarSubtitle: string;
    roasLineTitle: string;
    roasLineSubtitle: string;
  };
}): RenderedCampaignChart[] {
  if (typeof document === "undefined") return [];

  const canvas = document.createElement("canvas");
  const out: RenderedCampaignChart[] = [];

  if (input.charts.includes("spend_bar")) {
    const spendRows = topCampaignsBySpend(input.rows);
    out.push({
      key: "spend_bar",
      title: input.labels.spendBarTitle,
      dataUrl: drawBarChart(
        canvas,
        spendRows,
        input.labels.spendBarTitle,
        input.labels.spendBarSubtitle,
        "spend",
        VIOLET
      )
    });
  }

  if (input.charts.includes("roas_line")) {
    const roasRows = topCampaignsByRoas(input.rows);
    out.push({
      key: "roas_line",
      title: input.labels.roasLineTitle,
      dataUrl: drawLineChart(
        canvas,
        roasRows,
        input.labels.roasLineTitle,
        input.labels.roasLineSubtitle
      )
    });
  }

  return out;
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
