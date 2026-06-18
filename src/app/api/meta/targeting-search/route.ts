import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { getTenantMetaAccessToken } from "@/lib/meta-auth-store";
import { searchAdInterests, searchAdLocales, searchAdTargetingCategories, searchGeoLocations } from "@/lib/meta-graph";

/** Busca de segmentação do Meta (interesses, geolocalização, idiomas) para o criador de anúncios. */
export async function GET(req: Request) {
  const { tenant, user, metaAccessToken } = await getAppContext();
  const token = metaAccessToken ?? (await getTenantMetaAccessToken(tenant.id, user.id));
  if (!token) {
    return NextResponse.json({ ok: false, error: "Meta não conectada." }, { status: 400 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ ok: true, results: [] });

  try {
    if (type === "interest") {
      return NextResponse.json({ ok: true, results: await searchAdInterests(token, q) });
    }
    if (type === "geo") {
      return NextResponse.json({ ok: true, results: await searchGeoLocations(token, q) });
    }
    if (type === "locale") {
      return NextResponse.json({ ok: true, results: await searchAdLocales(token, q) });
    }
    if (type === "behavior") {
      return NextResponse.json({
        ok: true,
        results: await searchAdTargetingCategories(token, q, "behaviors")
      });
    }
    if (type === "demographic") {
      return NextResponse.json({
        ok: true,
        results: await searchAdTargetingCategories(token, q, "demographics")
      });
    }
    return NextResponse.json({ ok: false, error: "type inválido" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha na busca";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
