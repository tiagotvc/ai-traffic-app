import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { acceptInviteByToken } from "@/lib/workspace-members";

export async function POST(req: Request) {
  const { user } = await getAppContext();
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  }

  const result = await acceptInviteByToken(user, token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
