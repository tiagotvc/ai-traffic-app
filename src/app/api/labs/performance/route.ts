import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";
import { runPerformanceReadout } from "@/lib/labs/performance-scientist";

const FLAG = "campaigns.commander.scientists.performance";

/** GET → estado da flag. */
export async function GET() {
  return NextResponse.json({ ok: true, enabled: await isPlatformFeatureEnabled(FLAG) });
}

const BodySchema = z.object({ clientSlug: z.string().min(1) });

/** Performance Scientist: readout executivo da performance real de um cliente (read-only). */
export async function POST(req: Request) {
  const { tenant } = await getAppContext();
  if (!(await isPlatformFeatureEnabled(FLAG))) {
    return NextResponse.json({ ok: false, reason: "disabled" });
  }
  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const client = await getClientBySlugOrId(tenant.id, body.clientSlug);
  if (!client) return NextResponse.json({ ok: false, reason: "client_not_found" }, { status: 404 });

  const readout = await runPerformanceReadout(tenant.id, client.id);
  if (!readout.ran) return NextResponse.json({ ok: false, reason: readout.reason ?? "not_ran" });

  return NextResponse.json({ ok: true, readout });
}
