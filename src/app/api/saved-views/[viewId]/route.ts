import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ viewId: string }> }
) {
  const { viewId } = await params;
  const { tenant } = await getAppContext();
  const { savedView: repo } = await repositories();
  const view = await repo.findOne({ where: { id: viewId, tenantId: tenant.id } });
  if (!view) return NextResponse.json({ ok: false, error: "View não encontrada" }, { status: 404 });
  await repo.remove(view);
  return NextResponse.json({ ok: true });
}
