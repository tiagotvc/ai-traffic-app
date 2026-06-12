import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

const bodySchema = z.object({
  invoiceId: z.string().uuid(),
  reason: z.string().min(5).max(500)
});

export async function POST(req: Request) {
  try {
    const { tenant, user } = await getAppContext();
    if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
      return NextResponse.json({ ok: false, error: "Admin required" }, { status: 403 });
    }
    const body = bodySchema.parse(await req.json());
    const { invoice: invRepo, refundRequest: refRepo } = await repositories();
    const inv = await invRepo.findOne({ where: { id: body.invoiceId, tenantId: tenant.id } });
    if (!inv || inv.status !== "paid") {
      return NextResponse.json({ ok: false, error: "Invoice not eligible" }, { status: 400 });
    }
    const existing = await refRepo.findOne({
      where: { invoiceId: inv.id, status: "pending" }
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Refund already pending" }, { status: 409 });
    }
    const row = await refRepo.save(
      refRepo.create({
        tenantId: tenant.id,
        invoiceId: inv.id,
        requestedByUserId: user.id,
        provider: inv.provider,
        reason: body.reason,
        status: "pending"
      })
    );
    return NextResponse.json({ ok: true, refundRequest: row });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
