import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    await assertFeatureEnabled("reports.v2");
    const { tenant } = await getAppContext();
    const { templateId } = await params;
    const { reportTemplate: repo } = await repositories();
    await repo.delete({ id: templateId, tenantId: tenant.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "reports_v2_disabled" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
