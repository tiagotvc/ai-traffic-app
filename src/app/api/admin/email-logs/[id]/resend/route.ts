import { NextResponse } from "next/server";

import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { resendEmailLog } from "@/lib/messaging/email-log";

/** Reenvia um e-mail a partir de um log salvo (somente admin da plataforma). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBillingAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await resendEmailLog(id);
  if (!result.sent) {
    return NextResponse.json({ ok: false, error: result.error ?? "Falha ao reenviar" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
