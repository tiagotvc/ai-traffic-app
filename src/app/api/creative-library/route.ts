import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listCommunityLibraryItems, listMyLibraryItems } from "@/lib/creative-studio/library";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { tenant } = await getAppContext();
    await assertFeatureEnabled("creative-studio");
    const scope = new URL(req.url).searchParams.get("scope") === "community" ? "community" : "mine";
    const items = scope === "community" ? await listCommunityLibraryItems() : await listMyLibraryItems(tenant.id);
    return NextResponse.json({ ok: true, scope, items });
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "Recurso desabilitado" }, { status: 403 });
    }
    console.error("[creative-library GET]", err);
    return NextResponse.json({ ok: false, error: "Não foi possível carregar a biblioteca." }, { status: 500 });
  }
}
