import { getAppContext } from "@/lib/app-context";
import { resolveRanges } from "@/lib/dashboard-ranges";
import { DEFAULT_REPORT_METRICS, type ReportPreviewPayload } from "@/lib/report-preview-types";
import { buildReportPreview } from "@/lib/report-preview-data";
import { parsePeriodFromSearchParams } from "@/lib/report-period";
import type { MetricKey } from "@/lib/dashboard-metrics";

export const maxDuration = 60;

/** Export do relatório em **CSV** (R1.1) — reusa o builder do preview. */
function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function row(cells: unknown[]): string {
  return cells.map(cell).join(";");
}

function buildCsv(payload: Extract<ReportPreviewPayload, { ok: true }>): string {
  const lines: string[] = [];
  lines.push(row([payload.client.name, payload.period.currentLabel]));
  lines.push("");

  // Resumo (métrica × atual × anterior × variação).
  lines.push(row(["Resumo", "Atual", "Anterior", "Variação %"]));
  for (const bar of payload.comparisonBars) {
    lines.push(row([bar.key, bar.current, bar.previous, bar.delta ?? ""]));
  }
  lines.push("");

  // Série diária.
  const metricKeys = (
    Object.keys(payload.summary).length ? Object.keys(payload.summary) : DEFAULT_REPORT_METRICS
  ) as MetricKey[];
  lines.push(row(["Dia", ...metricKeys]));
  for (const day of payload.series) {
    lines.push(row(["day" in day ? day.day : "", ...metricKeys.map((k) => day[k] ?? "")]));
  }
  lines.push("");

  // Campanhas.
  lines.push(row(["Campanha", "Investimento", "Conversões", "Cliques", "Share %"]));
  for (const c of payload.campaigns) {
    lines.push(row([c.name, c.spend, c.conversions, c.clicks, c.sharePct]));
  }

  return lines.join("\n");
}

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const adAccountId = url.searchParams.get("adAccountId")?.trim() || null;
  const locale = url.searchParams.get("locale")?.trim() || "pt-BR";
  const reportType = url.searchParams.get("type") === "complete" ? "complete" : "simple";
  const goalLabel = url.searchParams.get("goalLabel")?.trim() || "Conversões";

  if (!clientId) {
    return new Response("client_required", { status: 400 });
  }

  const period = parsePeriodFromSearchParams(url);
  let current: { since: string; until: string } | null = null;
  let previous: { since: string; until: string } | null = null;

  if (period.since && period.until) {
    current = { since: period.since, until: period.until };
    const len = Math.round((Date.parse(period.until) - Date.parse(period.since)) / 86_400_000) + 1;
    const { addDaysIso } = await import("@/lib/report-period");
    const prevUntil = addDaysIso(period.since, -1);
    const prevSince = addDaysIso(prevUntil, -(len - 1));
    previous = { since: prevSince, until: prevUntil };
  } else {
    const preset =
      period.preset === "last30" ? "last30" : period.preset === "thisWeek" ? "thisWeek" : "last7";
    const resolved = resolveRanges({ preset, since: "", until: "" });
    current = resolved.current;
    previous = resolved.previous;
  }

  if (!current || !previous) {
    return new Response("invalid_period", { status: 400 });
  }

  const payload = await buildReportPreview({
    tenantId: tenant.id,
    clientParam: clientId,
    adAccountId,
    current,
    previous,
    locale,
    reportType,
    goalLabel,
    metaAccessToken
  });

  if (!payload.ok) {
    return new Response(payload.error ?? "error", {
      status: payload.error === "client_not_found" ? 404 : 400
    });
  }

  const csv = "﻿" + buildCsv(payload); // BOM p/ acentos no Excel
  const filename = `relatorio-${payload.client.slug}-${current.since}_${current.until}.csv`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
