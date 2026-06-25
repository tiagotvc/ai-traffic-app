import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

const PatchSchema = z.object({ status: z.enum(["new", "read"]) });

/** Atualiza o status de uma mensagem de contato (somente admin). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireBillingAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body;
  try {
    body = PatchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const { contactMessage } = await repositories();
  const row = await contactMessage.findOne({ where: { id } });
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  row.status = body.status;
  await contactMessage.save(row);
  return NextResponse.json({ ok: true });
}
