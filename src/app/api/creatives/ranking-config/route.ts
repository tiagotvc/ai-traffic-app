import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import { DEFAULT_RANK_CONFIG } from "@/lib/creative-ranking";
import { loadRankConfig, saveRankConfig } from "@/lib/ranking-config";

export async function GET() {
  const { tenant } = await getAppContext();
  const config = await loadRankConfig(tenant.id);
  return NextResponse.json({ ok: true, config, defaults: DEFAULT_RANK_CONFIG });
}

export async function PUT(req: Request) {
  const { tenant } = await getAppContext();

  try {
    await assertLimit(tenant.id, "allowRankingConfig");
  } catch (err) {
    const res = billingErrorResponse(err);
    if (res) return res;
    throw err;
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* corpo vazio */
  }
  const config = await saveRankConfig(tenant.id, body);
  return NextResponse.json({ ok: true, config });
}
