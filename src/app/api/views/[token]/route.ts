import { NextResponse } from "next/server";

import { getPublishedLayoutByToken } from "@/lib/dashboard/client-view-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const layout = await getPublishedLayoutByToken(token);
    if (!layout) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, layout });
  } catch (err) {
    console.error("[views GET]", err);
    return NextResponse.json({ ok: false, error: "Erro" }, { status: 500 });
  }
}
