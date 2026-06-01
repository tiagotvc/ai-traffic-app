import { NextResponse } from "next/server";

import { getInvitePreview } from "@/lib/workspace-members";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  }

  const preview = await getInvitePreview(token);
  if (!preview) {
    return NextResponse.json({ ok: false, error: "invalid_or_expired" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, preview });
}
