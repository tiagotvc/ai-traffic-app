import { NextResponse } from "next/server";

import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

/** Flags do módulo de relatórios para o client (v1 clássico × v2 com IA). */
export async function GET() {
  const [v1, v2] = await Promise.all([
    isPlatformFeatureEnabled("reports.v1"),
    isPlatformFeatureEnabled("reports.v2")
  ]);
  return NextResponse.json({ ok: true, v1, v2 });
}
