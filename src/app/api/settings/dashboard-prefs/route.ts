import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import {
  getUserDashboardChartMetrics,
  getUserDashboardClientMetric,
  saveUserDashboardChartMetrics,
  saveUserDashboardClientMetric
} from "@/lib/user-dashboard-prefs";

const PatchSchema = z
  .object({
    dashboardChartMetrics: z
      .array(z.string())
      .min(1)
      .max(3)
      .refine((arr) => arr.every((k) => k in METRIC_BY_KEY), "métrica inválida")
      .optional(),
    dashboardClientMetric: z
      .string()
      .refine((k) => k in METRIC_BY_KEY, "métrica inválida")
      .optional()
  })
  .refine(
    (body) => body.dashboardChartMetrics !== undefined || body.dashboardClientMetric !== undefined,
    "nenhuma preferência informada"
  );

export async function GET() {
  const { tenant, user } = await getAppContext();
  const [dashboardChartMetrics, dashboardClientMetric] = await Promise.all([
    getUserDashboardChartMetrics(tenant.id, user.id),
    getUserDashboardClientMetric(tenant.id, user.id)
  ]);
  return NextResponse.json({ ok: true, dashboardChartMetrics, dashboardClientMetric });
}

export async function PATCH(req: Request) {
  const { tenant, user } = await getAppContext();
  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  const [dashboardChartMetrics, dashboardClientMetric] = await Promise.all([
    body.dashboardChartMetrics !== undefined
      ? saveUserDashboardChartMetrics(
          tenant.id,
          user.id,
          body.dashboardChartMetrics as Parameters<typeof saveUserDashboardChartMetrics>[2]
        )
      : getUserDashboardChartMetrics(tenant.id, user.id),
    body.dashboardClientMetric !== undefined
      ? saveUserDashboardClientMetric(
          tenant.id,
          user.id,
          body.dashboardClientMetric as Parameters<typeof saveUserDashboardClientMetric>[2]
        )
      : getUserDashboardClientMetric(tenant.id, user.id)
  ]);

  return NextResponse.json({ ok: true, dashboardChartMetrics, dashboardClientMetric });
}
