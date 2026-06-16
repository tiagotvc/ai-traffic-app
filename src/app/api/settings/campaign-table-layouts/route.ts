import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { normalizeCampaignTableLayouts, type CampaignTableLayout } from "@/lib/campaign-table-layout";
import { listCustomMetricsForUser } from "@/lib/custom-metric-store";
import {
  getUserCampaignTableLayouts,
  saveUserCampaignTableLayouts
} from "@/lib/user-campaign-table-layouts";

const LayoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  columns: z.array(z.record(z.string(), z.unknown())).min(1).max(20)
});

const PatchSchema = z
  .object({
    activeLayoutId: z.string().min(1).optional(),
    layouts: z.array(LayoutSchema).optional()
  })
  .refine((b) => b.activeLayoutId !== undefined || b.layouts !== undefined, {
    message: "nenhuma preferência informada"
  });

export async function GET() {
  const { tenant, user } = await getAppContext();
  const [{ layouts, activeLayoutId }, customMetrics] = await Promise.all([
    getUserCampaignTableLayouts(tenant.id, user.id),
    listCustomMetricsForUser(tenant.id, user.id)
  ]);
  return NextResponse.json({ ok: true, layouts, activeLayoutId, customMetrics });
}

export async function PATCH(req: Request) {
  const { tenant, user } = await getAppContext();
  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  const current = await getUserCampaignTableLayouts(tenant.id, user.id);
  const layouts: CampaignTableLayout[] = body.layouts
    ? normalizeCampaignTableLayouts(body.layouts)
    : current.layouts;
  const activeLayoutId = body.activeLayoutId ?? current.activeLayoutId;

  const saved = await saveUserCampaignTableLayouts(
    tenant.id,
    user.id,
    layouts,
    activeLayoutId
  );
  return NextResponse.json({ ok: true, ...saved });
}
