import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { getAppsumoLicense, getAppsumoLicenseEvents } from "@/lib/billing/appsumo/licensing-api";

/** Support lookup: local tenant link + live AppSumo record + recent event history, by license_key. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ licenseKey: string }> }
) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const { licenseKey } = await params;

  try {
    const { appsumoLicense } = await repositories();
    const [local, appsumo, events] = await Promise.all([
      appsumoLicense.findOne({ where: { licenseKey } }),
      getAppsumoLicense(licenseKey).catch(() => null),
      getAppsumoLicenseEvents(licenseKey).catch(() => null)
    ]);

    if (!local && !appsumo) {
      return NextResponse.json({ ok: false, error: "License not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      local: local
        ? {
            tenantId: local.tenantId ?? null,
            licenseStatus: local.licenseStatus,
            tier: local.tier ?? null,
            prevLicenseKey: local.prevLicenseKey ?? null,
            lastEvent: local.lastEvent ?? null,
            lastEventAt: local.lastEventAt ?? null
          }
        : null,
      appsumo,
      events: events?.results ?? []
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
