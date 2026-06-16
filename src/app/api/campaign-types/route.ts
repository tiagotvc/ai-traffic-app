import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { listCampaignTypesForUser, normalizeTypeMetrics } from "@/lib/campaign-type-store";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";

export async function GET() {
  const { tenant, user } = await getAppContext();
  const types = await listCampaignTypesForUser(tenant.id, user.id);
  return NextResponse.json({
    ok: true,
    types: types.map((t) => ({
      id: t.id,
      name: t.name,
      metrics: normalizeTypeMetrics(t.metrics),
      shared: t.shared,
      createdByUserId: t.createdByUserId
    }))
  });
}

const PostSchema = z.object({
  name: z.string().min(1).max(80),
  metrics: z
    .array(z.string())
    .min(1)
    .max(8)
    .refine((arr) => arr.every((k) => k in METRIC_BY_KEY), "métrica inválida"),
  shared: z.boolean().optional()
});

export async function POST(req: Request) {
  const { tenant, user } = await getAppContext();
  const body = PostSchema.parse(await req.json().catch(() => ({})));
  const { campaignTypeDefinition: repo } = await repositories();
  const row = await repo.save(
    repo.create({
      tenantId: tenant.id,
      name: body.name.trim(),
      metrics: normalizeTypeMetrics(body.metrics),
      createdByUserId: user.id,
      shared: body.shared ?? true
    })
  );
  return NextResponse.json({
    ok: true,
    type: {
      id: row.id,
      name: row.name,
      metrics: normalizeTypeMetrics(row.metrics),
      shared: row.shared,
      createdByUserId: row.createdByUserId
    }
  });
}
