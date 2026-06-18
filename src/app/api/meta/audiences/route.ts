import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { fetchCustomAudiences } from "@/lib/meta-graph";

const CACHE_TTL_MS = 30 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const adAccountId = url.searchParams.get("adAccountId");
  if (!adAccountId) {
    return NextResponse.json({ ok: false, error: "adAccountId obrigatório" }, { status: 400 });
  }

  try {
    const { metaAudienceCache: cacheRepo } = await repositories();
    if (!refresh) {
      const cached = await cacheRepo.findOne({ where: { metaAdAccountId: adAccountId } });
      if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
        return NextResponse.json({ ok: true, audiences: cached.audiences, cached: true });
      }
    }

    const audiences = await fetchCustomAudiences(metaAccessToken, adAccountId);
    const cached = await cacheRepo.findOne({ where: { metaAdAccountId: adAccountId } });
    if (cached) {
      cached.audiences = audiences;
      cached.fetchedAt = new Date();
      await cacheRepo.save(cached);
    } else {
      await cacheRepo.save(
        cacheRepo.create({ metaAdAccountId: adAccountId, audiences, fetchedAt: new Date() })
      );
    }

    return NextResponse.json({ ok: true, audiences, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao buscar públicos na Meta";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
