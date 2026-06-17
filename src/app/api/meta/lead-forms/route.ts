import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { fetchLeadGenForms } from "@/lib/meta-graph";

export async function GET(req: Request) {
  const { metaAccessToken } = await getAppContext();
  if (!metaAccessToken) {
    return NextResponse.json({ ok: false, error: "Missing Meta access token" }, { status: 400 });
  }

  const url = new URL(req.url);
  const pageId = url.searchParams.get("pageId")?.trim();
  if (!pageId) {
    return NextResponse.json({ ok: false, error: "pageId required" }, { status: 400 });
  }

  try {
    const rows = await fetchLeadGenForms(metaAccessToken, pageId);
    const forms = rows
      .filter((f) => (f.status ?? "ACTIVE") !== "ARCHIVED")
      .map((f) => ({ id: f.id, name: f.name?.trim() || f.id }));
    return NextResponse.json({ ok: true, forms });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
