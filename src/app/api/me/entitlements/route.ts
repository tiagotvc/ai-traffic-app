import { NextResponse } from "next/server";

import { getAppShellContext } from "@/lib/app-shell-context";
import { getEntitlements } from "@/lib/billing/entitlements";
import { redisGetJson, redisSetJson } from "@/lib/redis-cache";

const CACHE_TTL_SEC = 60;

export async function GET() {
  const { tenant, platformAdmin } = await getAppShellContext();
  const cacheKey = `entitlements:${tenant.id}`;

  const cached = await redisGetJson<{
    entitlements: Awaited<ReturnType<typeof getEntitlements>>;
    isPlatformAdmin: boolean;
  }>(cacheKey);

  if (cached) {
    return NextResponse.json(
      { ok: true, ...cached },
      { headers: { "Cache-Control": "private, max-age=30" } }
    );
  }

  const entitlements = await getEntitlements(tenant.id);
  const payload = { entitlements, isPlatformAdmin: platformAdmin };
  void redisSetJson(cacheKey, payload, CACHE_TTL_SEC);

  return NextResponse.json({ ok: true, ...payload });
}
