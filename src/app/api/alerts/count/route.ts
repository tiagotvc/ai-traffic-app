import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { apiErrorResponse, requireAppShellContext } from "@/lib/api-auth";

export async function GET() {
  try {
    const { tenant } = await requireAppShellContext();
    const { alert: alertRepo } = await repositories();

    const count = await alertRepo.count({
      where: { tenantId: tenant.id, dismissed: false }
    });

    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return apiErrorResponse(err, "api/alerts/count");
  }
}
