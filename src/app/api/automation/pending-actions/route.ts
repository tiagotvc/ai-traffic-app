import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

/** Fila de pendências das regras em modo "Pedir aprovação". */
export async function GET(req: Request) {
  const { tenant } = await getAppContext();
  const status = new URL(req.url).searchParams.get("status") ?? "pending";

  const { automationPendingAction: repo } = await repositories();
  const actions = await repo.find({
    where: { tenantId: tenant.id, status: status as "pending" | "approved" | "rejected" },
    order: { createdAt: "DESC" },
    take: 100
  });

  return NextResponse.json({ ok: true, actions });
}
