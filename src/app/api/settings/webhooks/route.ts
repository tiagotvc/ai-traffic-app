import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

const urlOrEmpty = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), { message: "invalid_url" });

const PatchSchema = z.object({
  webhookAlertUrl: urlOrEmpty.optional(),
  webhookReportUrl: urlOrEmpty.optional()
});

export async function GET() {
  const { tenant } = await getAppContext();
  return NextResponse.json({
    ok: true,
    webhooks: {
      webhookAlertUrl: tenant.webhookAlertUrl ?? "",
      webhookReportUrl: tenant.webhookReportUrl ?? ""
    }
  });
}

export async function PATCH(req: Request) {
  const { tenant } = await getAppContext();
  const { tenant: tenantRepo } = await repositories();
  const body = PatchSchema.parse(await req.json().catch(() => ({})));

  if (body.webhookAlertUrl !== undefined) {
    tenant.webhookAlertUrl = body.webhookAlertUrl || null;
  }
  if (body.webhookReportUrl !== undefined) {
    tenant.webhookReportUrl = body.webhookReportUrl || null;
  }

  await tenantRepo.save(tenant);

  return NextResponse.json({
    ok: true,
    webhooks: {
      webhookAlertUrl: tenant.webhookAlertUrl ?? "",
      webhookReportUrl: tenant.webhookReportUrl ?? ""
    }
  });
}
