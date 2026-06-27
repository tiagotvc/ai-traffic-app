import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";
import { getCapiStatus } from "@/lib/meta-capi-service";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

/** Observabilidade da CAPI por cliente (P0.4): enviados 24h + último erro. */
export async function GET(req: Request) {
  try {
    await assertFeatureEnabled("meta.capi");
    const { tenant, user } = await getAppContext();
    if (!(await isWorkspaceAdmin(tenant.id, user.id))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const clientId = new URL(req.url).searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ ok: false, error: "clientId required" }, { status: 400 });

    const { client: clientRepo } = await repositories();
    const client = await clientRepo.findOne({ where: { id: clientId, tenantId: tenant.id } });
    if (!client) return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });

    return NextResponse.json({ ok: true, status: await getCapiStatus(tenant.id, clientId) });
  } catch (e) {
    if (e instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "capi_disabled" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
