import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { listCommunityLibraryItems, listMyLibraryItems } from "@/lib/creative-studio/library";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { tenant } = await getAppContext();
    const scope = new URL(req.url).searchParams.get("scope") === "community" ? "community" : "mine";
    const items = scope === "community" ? await listCommunityLibraryItems() : await listMyLibraryItems(tenant.id);
    return NextResponse.json({ ok: true, scope, items });
  } catch (err) {
    console.error("[creative-library GET]", err);
    return NextResponse.json({ ok: false, error: "Não foi possível carregar a biblioteca." }, { status: 500 });
  }
}
