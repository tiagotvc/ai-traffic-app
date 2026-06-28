import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const PatchSchema = z.object({
  brandName: z.string().min(1).optional(),
  logoUrl: z.string().optional(),
  agencyBrainNicheShareOptIn: z.boolean().optional()
});

function touchesWhiteLabel(body: z.infer<typeof PatchSchema>) {
  return body.brandName !== undefined || body.logoUrl !== undefined;
}

export async function GET() {
  const { tenant } = await getAppContext();
  return NextResponse.json({
    ok: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl,
      agencyBrainNicheShareOptIn: tenant.agencyBrainNicheShareOptIn ?? false
    }
  });
}

export async function PATCH(req: Request) {
  const { tenant, entitlements } = await getAppContext();
  const { tenant: tenantRepo } = await repositories();
  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  if (touchesWhiteLabel(body) && !entitlements.limits.allowWhiteLabel) {
    return NextResponse.json(
      { ok: false, error: "plan_white_label_required" },
      { status: 403 }
    );
  }

  if (body.brandName !== undefined) tenant.brandName = body.brandName;
  if (body.logoUrl !== undefined) tenant.logoUrl = body.logoUrl || null;
  if (body.agencyBrainNicheShareOptIn !== undefined) {
    tenant.agencyBrainNicheShareOptIn = body.agencyBrainNicheShareOptIn;
  }

  await tenantRepo.save(tenant);

  return NextResponse.json({
    ok: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl,
      agencyBrainNicheShareOptIn: tenant.agencyBrainNicheShareOptIn ?? false
    }
  });
}
