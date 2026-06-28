import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

const ConfigSchema = z.object({
  reportType: z.enum(["simple", "complete"]),
  metrics: z.array(z.string()).max(12).default([]),
  periodPreset: z.string().nullable().optional()
});

const BodySchema = z.object({
  name: z.string().min(1).max(120),
  config: ConfigSchema
});

async function guard(): Promise<string> {
  await assertFeatureEnabled("reports.v2");
  const { tenant } = await getAppContext();
  return tenant.id;
}

function errorResponse(e: unknown) {
  if (e instanceof FeatureDisabledError) {
    return NextResponse.json({ ok: false, error: "reports_v2_disabled" }, { status: 404 });
  }
  return NextResponse.json(
    { ok: false, error: e instanceof Error ? e.message : "error" },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const tenantId = await guard();
    const { reportTemplate: repo } = await repositories();
    const rows = await repo.find({ where: { tenantId }, order: { createdAt: "DESC" } });
    return NextResponse.json({
      ok: true,
      templates: rows.map((r) => ({ id: r.id, name: r.name, config: r.config }))
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await guard();
    const body = BodySchema.parse(await req.json().catch(() => ({})));
    const { reportTemplate: repo } = await repositories();
    const row = await repo.save(
      repo.create({ tenantId, name: body.name.trim(), config: body.config })
    );
    return NextResponse.json({ ok: true, template: { id: row.id, name: row.name, config: row.config } });
  } catch (e) {
    return errorResponse(e);
  }
}
