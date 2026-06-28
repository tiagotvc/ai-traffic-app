import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { resolveRanges } from "@/lib/dashboard-ranges";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";
import { buildAgencyConsolidated } from "@/lib/report-preview-data";
import { parsePeriodFromSearchParams } from "@/lib/report-period";

export const maxDuration = 60;

/** R3 — Relatório consolidado da agência (carteira). Gate: `reports.v2`. */
export async function GET(req: Request) {
  try {
    await assertFeatureEnabled("reports.v2");
  } catch (e) {
    if (e instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "reports_v2_disabled" }, { status: 404 });
    }
    throw e;
  }

  const { tenant } = await getAppContext();
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale")?.trim() || "pt-BR";

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
    return NextResponse.json({ ok: false, error: "invalid_period" }, { status: 400 });
  }

  const data = await buildAgencyConsolidated(tenant.id, current, previous, locale);
  return NextResponse.json({ ok: true, ...data });
}
