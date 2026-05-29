import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const PatchSchema = z.object({
  brandName: z.string().min(1).optional(),
  logoUrl: z.string().optional()
});

export async function GET() {
  const { tenant } = await getAppContext();
  return NextResponse.json({
    ok: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl
    }
  });
}

export async function PATCH(req: Request) {
  const { tenant } = await getAppContext();
  const { tenant: tenantRepo } = await repositories();
  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  if (body.brandName !== undefined) tenant.brandName = body.brandName;
  if (body.logoUrl !== undefined) tenant.logoUrl = body.logoUrl || null;

  await tenantRepo.save(tenant);

  return NextResponse.json({
    ok: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl
    }
  });
}
