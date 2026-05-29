import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tenant } = await getAppContext();
  const { alert: repo } = await repositories();

  const alert = await repo.findOne({ where: { id, tenantId: tenant.id } });
  if (!alert) return NextResponse.json({ ok: false, error: "Alerta não encontrado" }, { status: 404 });

  alert.dismissed = true;
  await repo.save(alert);
  return NextResponse.json({ ok: true });
}
