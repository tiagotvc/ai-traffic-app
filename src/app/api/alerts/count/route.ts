import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppShellContext } from "@/lib/app-shell-context";

export async function GET() {
  const { tenant } = await getAppShellContext();
  const { alert: alertRepo } = await repositories();

  const count = await alertRepo.count({
    where: { tenantId: tenant.id, dismissed: false }
  });

  return NextResponse.json({ ok: true, count });
}
