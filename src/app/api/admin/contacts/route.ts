import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

/** Lista mensagens de contato (somente admin da plataforma). */
export async function GET() {
  const auth = await requireBillingAdmin();
  if (!auth.ok) return auth.response;

  const { contactMessage } = await repositories();
  const messages = await contactMessage.find({
    order: { createdAt: "DESC" },
    take: 200
  });
  return NextResponse.json({ ok: true, messages });
}
