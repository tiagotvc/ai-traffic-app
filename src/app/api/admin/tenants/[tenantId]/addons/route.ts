import { NextResponse } from "next/server";
import { z } from "zod";

import { updateTenantAddonsAdmin } from "@/lib/admin/platform-users";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";
import { getTenantAddonRow, tenantAddonToJson } from "@/lib/billing/tenant-addons";

const patchSchema = z.object({
  extraClients: z.number().int().min(0).optional(),
  extraAdAccounts: z.number().int().min(0).optional(),
  extraMembers: z.number().int().min(0).optional(),
  extraAutomationRules: z.number().int().min(0).optional(),
  extraAiRequestsPerMonth: z.number().int().min(0).optional(),
  extraScheduledReports: z.number().int().min(0).optional(),
  adminNote: z.string().max(500).nullable().optional()
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const { tenantId } = await params;
  const row = await getTenantAddonRow(tenantId);
  return NextResponse.json({ ok: true, addons: tenantAddonToJson(row) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const { tenantId } = await params;
    const body = patchSchema.parse(await req.json());
    const addons = await updateTenantAddonsAdmin(tenantId, body);
    return NextResponse.json({ ok: true, addons });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
