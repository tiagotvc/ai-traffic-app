import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";
import {
  DASHBOARD_SECTION_KEYS,
  MAX_HERO_METRICS,
  MAX_PERIOD_METRICS,
  normalizeDashboardLayout
} from "@/lib/dashboard-layout-prefs";
import {
  getUserDashboardChartMetrics,
  getUserDashboardClientMetric,
  getUserDashboardLayout,
  saveUserDashboardChartMetrics,
  saveUserDashboardClientMetric,
  saveUserDashboardLayout
} from "@/lib/user-dashboard-prefs";

const SectionsSchema = z
  .object(
    Object.fromEntries(DASHBOARD_SECTION_KEYS.map((key) => [key, z.boolean()])) as Record<
      (typeof DASHBOARD_SECTION_KEYS)[number],
      z.ZodBoolean
    >
  )
  .partial();

const LayoutSchema = z.object({
  sections: SectionsSchema.optional(),
  heroMetrics: z
    .array(z.string())
    .max(MAX_HERO_METRICS)
    .refine((arr) => arr.every((k) => k in METRIC_BY_KEY), "métrica inválida")
    .optional(),
  periodMetrics: z
    .array(z.string())
    .max(MAX_PERIOD_METRICS)
    .refine((arr) => arr.every((k) => k in METRIC_BY_KEY), "métrica inválida")
    .optional(),
  sectionOrder: z
    .array(z.string())
    .refine(
      (arr) =>
        arr.every((k) => DASHBOARD_SECTION_KEYS.includes(k as (typeof DASHBOARD_SECTION_KEYS)[number])),
      "seção inválida"
    )
    .optional(),
  chartSize: z.enum(["compact", "default", "tall"]).optional()
});

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
      .optional(),
    dashboardLayout: LayoutSchema.optional()
  })
  .refine(
    (body) =>
      body.dashboardChartMetrics !== undefined ||
      body.dashboardClientMetric !== undefined ||
      body.dashboardLayout !== undefined,
    "nenhuma preferência informada"
  );

export async function GET() {
  const { tenant, user } = await getAppContext();
  const [dashboardChartMetrics, dashboardClientMetric, dashboardLayout] = await Promise.all([
    getUserDashboardChartMetrics(tenant.id, user.id),
    getUserDashboardClientMetric(tenant.id, user.id),
    getUserDashboardLayout(tenant.id, user.id)
  ]);
  return NextResponse.json({
    ok: true,
    dashboardChartMetrics,
    dashboardClientMetric,
    dashboardLayout
  });
}

export async function PATCH(req: Request) {
  const { tenant, user } = await getAppContext();
  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  const [dashboardChartMetrics, dashboardClientMetric, dashboardLayout] = await Promise.all([
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
      : getUserDashboardClientMetric(tenant.id, user.id),
    body.dashboardLayout !== undefined
      ? saveUserDashboardLayout(
          tenant.id,
          user.id,
          normalizeDashboardLayout({
            ...(await getUserDashboardLayout(tenant.id, user.id)),
            ...body.dashboardLayout
          })
        )
      : getUserDashboardLayout(tenant.id, user.id)
  ]);

  return NextResponse.json({
    ok: true,
    dashboardChartMetrics,
    dashboardClientMetric,
    dashboardLayout
  });
}
