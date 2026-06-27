import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";
import { ATTRIBUTION_PRESETS } from "@/lib/meta-attribution";
import { getTenantAttributionWindow, setTenantAttributionWindow } from "@/lib/tenant-attribution";
import { isWorkspaceAdmin } from "@/lib/workspace-members";

/** Preferência de janela de atribuição por workspace. Admin; gate `meta.attribution`. */
async function guard(): Promise<string> {
  await assertFeatureEnabled("meta.attribution");
  const { tenant, user } = await getAppContext();
  if (!(await isWorkspaceAdmin(tenant.id, user.id))) throw new Error("forbidden");
  return tenant.id;
}

function errorResponse(e: unknown) {
  if (e instanceof FeatureDisabledError) {
    return NextResponse.json({ ok: false, error: "attribution_disabled" }, { status: 404 });
  }
  const msg = e instanceof Error ? e.message : "error";
  return NextResponse.json({ ok: false, error: msg }, { status: msg === "forbidden" ? 403 : 500 });
}

export async function GET() {
  try {
    const tenantId = await guard();
    return NextResponse.json({
      ok: true,
      presets: Object.keys(ATTRIBUTION_PRESETS),
      window: await getTenantAttributionWindow(tenantId)
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    const tenantId = await guard();
    const body = (await req.json().catch(() => ({}))) as { window?: unknown };
    const window = await setTenantAttributionWindow(
      tenantId,
      typeof body?.window === "string" ? body.window : null
    );
    return NextResponse.json({ ok: true, window });
  } catch (e) {
    return errorResponse(e);
  }
}
