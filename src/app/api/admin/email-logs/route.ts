import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

/** Lista tentativas recentes de e-mail transacional (somente admin da plataforma). */
export async function GET() {
  const auth = await requireBillingAdmin();
  if (!auth.ok) return auth.response;

  const { emailLog: repo } = await repositories();
  const logs = await repo.find({
    order: { createdAt: "DESC" },
    take: 200
  });
  return NextResponse.json({ ok: true, logs });
}
