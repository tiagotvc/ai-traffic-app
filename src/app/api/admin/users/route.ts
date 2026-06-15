import { NextResponse } from "next/server";

import { listPlatformUsers } from "@/lib/admin/platform-users";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

export async function GET(req: Request) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "25");

  const result = await listPlatformUsers({ q, page, limit });
  return NextResponse.json({ ok: true, ...result });
}
