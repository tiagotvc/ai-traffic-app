import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import {
  createCustomMetric,
  listCustomMetricsForUser
} from "@/lib/custom-metric-store";

export async function GET() {
  const { tenant, user } = await getAppContext();
  const metrics = await listCustomMetricsForUser(tenant.id, user.id);
  return NextResponse.json({ ok: true, metrics });
}

const PostSchema = z.object({
  name: z.string().min(1).max(80),
  formula: z.string().min(1).max(500),
  format: z.enum(["currency", "number", "percent", "ratio", "multiplier"]).optional(),
  shared: z.boolean().optional()
});

export async function POST(req: Request) {
  const { tenant, user } = await getAppContext();
  const body = PostSchema.parse(await req.json().catch(() => ({})));
  try {
    const metric = await createCustomMetric({
      tenantId: tenant.id,
      userId: user.id,
      name: body.name,
      formula: body.formula,
      format: body.format ?? "number",
      shared: body.shared ?? false
    });
    return NextResponse.json({ ok: true, metric });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "invalid_formula" },
      { status: 400 }
    );
  }
}
