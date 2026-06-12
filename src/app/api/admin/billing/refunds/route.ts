import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { getBillingProvider } from "@/lib/billing/providers";

export async function GET() {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;
  const { refundRequest: refRepo } = await repositories();
  const rows = await refRepo.find({ order: { createdAt: "DESC" }, take: 100 });
  return NextResponse.json({ ok: true, refunds: rows });
}

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  note: z.string().optional()
});

export async function POST(req: Request) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;
  const email = gate.email;
  try {
    const body = actionSchema.parse(await req.json());
    const { refundRequest: refRepo, invoice: invRepo, user: userRepo } = await repositories();
    const row = await refRepo.findOne({ where: { id: body.id } });
    if (!row || row.status !== "pending") {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    const admin = await userRepo.findOne({ where: { email: email.toLowerCase() } });

    if (body.action === "reject") {
      row.status = "rejected";
      row.reviewedByUserId = admin?.id ?? null;
      row.reviewedAt = new Date();
      row.reviewNote = body.note ?? null;
      await refRepo.save(row);
      return NextResponse.json({ ok: true, refund: row });
    }

    const inv = await invRepo.findOne({ where: { id: row.invoiceId } });
    if (!inv?.externalPaymentId) {
      return NextResponse.json({ ok: false, error: "No payment id" }, { status: 400 });
    }
    const provider = getBillingProvider(row.provider);
    const result = await provider.refundPayment(inv.externalPaymentId);
    inv.status = "refunded";
    await invRepo.save(inv);
    row.status = "processed";
    row.externalRefundId = result.id;
    row.reviewedByUserId = admin?.id ?? null;
    row.reviewedAt = new Date();
    row.reviewNote = body.note ?? null;
    await refRepo.save(row);
    return NextResponse.json({ ok: true, refund: row });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
