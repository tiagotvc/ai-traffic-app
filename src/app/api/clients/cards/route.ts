import { NextResponse } from "next/server";

import { getAppShellContext } from "@/lib/app-shell-context";
import { listClientsForTenant } from "@/lib/app-context";
import { buildClientListCards } from "@/lib/clients-list";
import { parsePeriodFromSearchParams } from "@/lib/report-period";
import { redisGetJson, redisSetJson } from "@/lib/redis-cache";

const CACHE_TTL_SEC = 60;

export async function GET(req: Request) {
  const { tenant } = await getAppShellContext();
  const url = new URL(req.url);
  const period = parsePeriodFromSearchParams(url);
  const periodKey = url.searchParams.get("period") ?? "custom";

  const cacheKey = `clients:cards:${tenant.id}:${periodKey}:${period.since ?? "all"}:${period.until ?? "all"}`;
  const cached = await redisGetJson<{ clients: Awaited<ReturnType<typeof buildClientListCards>> }>(
    cacheKey
  );
  if (cached) {
    return NextResponse.json(
      { ok: true, clients: cached.clients },
      { headers: { "Cache-Control": "private, max-age=30" } }
    );
  }

  const clients = await listClientsForTenant(tenant.id);
  const cards = await buildClientListCards(tenant.id, clients, period);
  void redisSetJson(cacheKey, { clients: cards }, CACHE_TTL_SEC);

  return NextResponse.json({ ok: true, clients: cards });
}
