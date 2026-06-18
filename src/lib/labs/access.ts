import { NextResponse } from "next/server";

import { billingErrorResponse } from "@/lib/billing/api-errors";
import { assertLimit } from "@/lib/billing/entitlements";
import type { getAppContext } from "@/lib/app-context";

type LabsAccessContext = Pick<
  Awaited<ReturnType<typeof getAppContext>>,
  "tenant" | "platformAdmin"
>;

export async function assertLabsAccess({ tenant, platformAdmin }: LabsAccessContext) {
  if (platformAdmin) return null;

  try {
    await assertLimit(tenant.id, "allowAgencyBrainExperiments");
  } catch (err) {
    const res = billingErrorResponse(err);
    if (res) return res;
    throw err;
  }

  return null;
}

export function labsUnavailableResponse() {
  return NextResponse.json({ ok: false, error: "Labs indisponível" }, { status: 403 });
}
