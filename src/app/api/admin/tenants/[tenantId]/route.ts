import { NextResponse } from "next/server";
import { z } from "zod";

import { updateTenantProfile } from "@/lib/admin/platform-users";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  brandName: z.string().max(120).nullable().optional()
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const { tenantId } = await params;
    const body = patchSchema.parse(await req.json());
    const tenant = await updateTenantProfile(tenantId, body);
    if (!tenant) {
      return NextResponse.json({ ok: false, error: "Workspace não encontrado" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        brandName: tenant.brandName ?? null
      }
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
