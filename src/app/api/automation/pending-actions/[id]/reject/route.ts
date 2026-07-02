import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const BodySchema = z.object({ reason: z.string().max(500).optional() });

/** Rejeita uma pendência: nada é executado na Meta. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tenant, user } = await getAppContext();
  const body = BodySchema.parse(await req.json().catch(() => ({})));

  const { automationPendingAction: pendingRepo } = await repositories();
  const pending = await pendingRepo.findOne({ where: { id, tenantId: tenant.id } });
  if (!pending) {
    return NextResponse.json({ ok: false, error: "Pendência não encontrada" }, { status: 404 });
  }
  if (pending.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Pendência já foi resolvida" }, { status: 409 });
  }

  pending.status = "rejected";
  pending.approvedBy = user.id;
  pending.approvedAt = new Date();
  pending.rejectionReason = body.reason?.trim() || null;
  await pendingRepo.save(pending);

  return NextResponse.json({ ok: true, action: pending });
}
