import "server-only";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import { resolveRanges } from "@/lib/dashboard-ranges";
import type { MetricKey } from "@/lib/dashboard-metrics";
import { DEFAULT_REPORT_METRICS } from "@/lib/report-preview-types";
import { buildReportPreview } from "@/lib/report-preview-data";
import {
  loadClientCreativesPerformance,
  type ReportCreativeGroup
} from "@/lib/report-creatives-performance";
import {
  addDaysIso,
  parsePeriodFromSearchParams,
  type PeriodPreset
} from "@/lib/report-period";
import { verifyReportPrintToken } from "@/lib/report-print-token";

export type ReportPrintQuery = {
  pdfToken?: string;
  clientId?: string;
  adAccountId?: string;
  type?: string;
  locale?: string;
  goalLabel?: string;
  period?: string;
  since?: string;
  until?: string;
  metrics?: string;
};

export function periodQueryFromParts(input: {
  preset: PeriodPreset;
  since?: string;
  until?: string;
}): string {
  const qs = new URLSearchParams();
  qs.set("period", input.preset);
  if (input.preset === "custom" && input.since && input.until) {
    qs.set("since", input.since);
    qs.set("until", input.until);
  }
  return qs.toString();
}

export async function resolveReportPeriodRanges(input: {
  preset: PeriodPreset;
  since?: string;
  until?: string;
}) {
  if (input.preset === "custom" && input.since && input.until) {
    const len = Math.round((Date.parse(input.until) - Date.parse(input.since)) / 86_400_000) + 1;
    const prevUntil = addDaysIso(input.since, -1);
    const prevSince = addDaysIso(prevUntil, -(len - 1));
    return {
      current: { since: input.since, until: input.until },
      previous: { since: prevSince, until: prevUntil }
    };
  }

  const url = new URL("http://local");
  url.searchParams.set("period", input.preset);
  const parsed = parsePeriodFromSearchParams(url);
  if (parsed.since && parsed.until) {
    const len = Math.round((Date.parse(parsed.until) - Date.parse(parsed.since)) / 86_400_000) + 1;
    const prevUntil = addDaysIso(parsed.since, -1);
    const prevSince = addDaysIso(prevUntil, -(len - 1));
    return {
      current: { since: parsed.since, until: parsed.until },
      previous: { since: prevSince, until: prevUntil }
    };
  }

  const resolved = resolveRanges({ preset: input.preset, since: "", until: "" });
  return { current: resolved.current, previous: resolved.previous };
}

function parseMetrics(raw?: string): MetricKey[] {
  if (!raw?.trim()) return DEFAULT_REPORT_METRICS;
  const keys = raw.split(",").map((k) => k.trim()) as MetricKey[];
  return keys.length ? keys : DEFAULT_REPORT_METRICS;
}

export async function loadReportPrintBundle(query: ReportPrintQuery) {
  const locale = query.locale?.trim() || "pt-BR";
  const reportType = query.type === "complete" ? "complete" : "simple";
  const goalLabel = query.goalLabel?.trim() || "Conversões";
  const selectedMetrics = parseMetrics(query.metrics);

  let tenantId: string;
  let clientParam: string;
  let adAccountId: string | null = query.adAccountId?.trim() || null;
  let preset: PeriodPreset = (query.period as PeriodPreset) || "thisWeek";
  let since = query.since?.trim();
  let until = query.until?.trim();

  if (query.pdfToken) {
    const token = verifyReportPrintToken(query.pdfToken);
    if (!token) return { ok: false as const, error: "invalid_token" };
    tenantId = token.tenantId;
    clientParam = token.clientParam;
    adAccountId = token.adAccountId ?? null;
    preset = token.preset;
    since = token.since;
    until = token.until;
    const payload = await buildReportForTenant({
      tenantId,
      clientParam,
      adAccountId,
      preset,
      since,
      until,
      locale: token.locale,
      reportType: token.reportType,
      goalLabel: token.goalLabel
    });
    if (!payload.ok) return payload;
    const { current } = await resolveReportPeriodRanges({
      preset,
      since,
      until
    });
    let creativeGroups: ReportCreativeGroup[] | undefined;
    if (current?.since && current.until) {
      try {
        const perf = await loadClientCreativesPerformance({
          tenantId,
          clientParam,
          adAccountId,
          since: current.since,
          until: current.until,
          period: { preset, since, until, days: null, allTime: false },
          skipCache: true
        });
        creativeGroups = perf.groups;
      } catch {
        creativeGroups = [];
      }
    }
    const { tenant: tenantRepo } = await repositories();
    const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
    return {
      ok: true as const,
      payload,
      reportType: token.reportType,
      locale: token.locale,
      selectedMetrics: token.selectedMetrics ?? selectedMetrics,
      periodQuery: periodQueryFromParts({ preset, since, until }),
      adAccountId,
      brandName: tenant?.brandName ?? tenant?.name ?? null,
      creativeGroups
    };
  }

  try {
    const { tenant } = await getAppContext();
    tenantId = tenant.id;
    clientParam = query.clientId?.trim() ?? "";
    if (!clientParam) return { ok: false as const, error: "client_required" };

    const client = await getClientBySlugOrId(tenant.id, clientParam);
    if (!client) return { ok: false as const, error: "client_not_found" };

    const payload = await buildReportForTenant({
      tenantId,
      clientParam,
      adAccountId,
      preset,
      since,
      until,
      locale,
      reportType,
      goalLabel
    });
    if (!payload.ok) return payload;

    return {
      ok: true as const,
      payload,
      reportType: reportType as "simple" | "complete",
      locale,
      selectedMetrics,
      periodQuery: periodQueryFromParts({ preset, since, until }),
      adAccountId,
      brandName: tenant.brandName ?? tenant.name
    };
  } catch {
    return { ok: false as const, error: "unauthorized" };
  }
}

async function buildReportForTenant(input: {
  tenantId: string;
  clientParam: string;
  adAccountId: string | null;
  preset: PeriodPreset;
  since?: string;
  until?: string;
  locale: string;
  reportType: "simple" | "complete";
  goalLabel: string;
}) {
  const { current, previous } = await resolveReportPeriodRanges({
    preset: input.preset,
    since: input.since,
    until: input.until
  });
  if (!current || !previous) return { ok: false as const, error: "invalid_period" };

  const payload = await buildReportPreview({
    tenantId: input.tenantId,
    clientParam: input.clientParam,
    adAccountId: input.adAccountId,
    current,
    previous,
    locale: input.locale,
    reportType: input.reportType,
    goalLabel: input.goalLabel
  });

  if (!payload.ok) return { ok: false as const, error: payload.error ?? "preview_failed" };
  return payload;
}
