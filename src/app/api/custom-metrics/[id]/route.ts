import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { deleteCustomMetric } from "@/lib/custom-metric-store";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { tenant, user } = await getAppContext();
  const { id } = await ctx.params;
  const { tenantMember: memberRepo } = await repositories();
  const member = await memberRepo.findOne({ where: { tenantId: tenant.id, userId: user.id } });
  const isAdmin = member?.role === "admin";
  const ok = await deleteCustomMetric(tenant.id, user.id, id, isAdmin);
  if (!ok) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
