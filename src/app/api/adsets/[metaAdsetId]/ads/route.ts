import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { fetchAdsForAdSet } from "@/lib/meta-graph";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ metaAdsetId: string }> }
) {
  const { metaAdsetId } = await params;
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Meta não conectada" }, { status: 400 });
  }

  const ads = await fetchAdsForAdSet(metaAccessToken, metaAdsetId);
  return NextResponse.json({ ok: true, ads });
}
