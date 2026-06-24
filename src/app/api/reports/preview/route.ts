import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resolveRanges } from "@/lib/dashboard-ranges";
import { buildReportPreview } from "@/lib/report-preview-data";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

export const maxDuration = 60;

export async function GET(req: Request) {
  const { tenant, metaAccessToken } = await getAppContext();
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const adAccountId = url.searchParams.get("adAccountId")?.trim() || null;
  const locale = url.searchParams.get("locale")?.trim() || "pt-BR";
  const reportType = url.searchParams.get("type") === "complete" ? "complete" : "simple";
  const goalLabel = url.searchParams.get("goalLabel")?.trim() || "Conversões";

  if (!clientId) {
    return NextResponse.json({ ok: false, error: "client_required" }, { status: 400 });
  }

  const period = parsePeriodFromSearchParams(url);
  let current: { since: string; until: string } | null = null;
  let previous: { since: string; until: string } | null = null;

  if (period.since && period.until) {
    current = { since: period.since, until: period.until };
    const len =
      Math.round((Date.parse(period.until) - Date.parse(period.since)) / 86_400_000) + 1;
    const { addDaysIso } = await import("@/lib/report-period");
    const prevUntil = addDaysIso(period.since, -1);
    const prevSince = addDaysIso(prevUntil, -(len - 1));
    previous = { since: prevSince, until: prevUntil };
  } else {
    const preset = period.preset === "last30" ? "last30" : period.preset === "thisWeek" ? "thisWeek" : "last7";
    const resolved = resolveRanges({ preset, since: "", until: "" });
    current = resolved.current;
    previous = resolved.previous;
  }

  if (!current || !previous) {
    return NextResponse.json({ ok: false, error: "invalid_period" }, { status: 400 });
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
    return NextResponse.json(payload, { status: payload.error === "client_not_found" ? 404 : 400 });
  }

  return NextResponse.json(payload);
}
