import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import {
  getUserDashboardChartMetrics,
  saveUserDashboardChartMetrics
} from "@/lib/user-dashboard-prefs";

const PatchSchema = z.object({
  dashboardChartMetrics: z
    .array(z.string())
    .min(1)
    .max(3)
    .refine((arr) => arr.every((k) => k in METRIC_BY_KEY), "métrica inválida")
});

export async function GET() {
  const { tenant, user } = await getAppContext();
  const dashboardChartMetrics = await getUserDashboardChartMetrics(tenant.id, user.id);
  return NextResponse.json({ ok: true, dashboardChartMetrics });
}

export async function PATCH(req: Request) {
  const { tenant, user } = await getAppContext();
  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  const dashboardChartMetrics = await saveUserDashboardChartMetrics(
    tenant.id,
    user.id,
    body.dashboardChartMetrics as Parameters<typeof saveUserDashboardChartMetrics>[2]
  );
  return NextResponse.json({ ok: true, dashboardChartMetrics });
}
