import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { getWorkspaceGoogleAccessToken } from "@/lib/google-auth-store";
import { listAccessibleCustomerGroups } from "@/lib/google-ads-api";
import { isGoogleAdsConfigured, isGoogleAdsEnabled } from "@/lib/google-env";

const BodySchema = z.object({
  // dígitos da conta Google Ads, ou null para desvincular
  customerId: z.string().nullable(),
  loginCustomerId: z.string().nullable().optional()
});

/** Status do vínculo Google Ads do cliente + contas disponíveis para o picker. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  let managers: Awaited<ReturnType<typeof listAccessibleCustomerGroups>> = [];
  let connected = false;
  if (isGoogleAdsConfigured()) {
    const token = await getWorkspaceGoogleAccessToken(tenant.id);
    if (token) {
      connected = true;
      try {
        managers = await listAccessibleCustomerGroups(token);
      } catch {
        /* mantém picker vazio se a API falhar */
      }
    }
  }

  return NextResponse.json({
    ok: true,
    linkedCustomerId: client.googleAdsCustomerId ?? null,
    linkedLoginCustomerId: client.googleAdsLoginCustomerId ?? null,
    connected,
    managers,
    accounts: managers.flatMap((manager) =>
      manager.accounts.map((account) => ({
        ...account,
        managerId: manager.id,
        loginCustomerId: manager.id === "direct" ? account.id : manager.id
      }))
    )
  });
}

/** Vincula (ou desvincula, com null) uma conta Google Ads ao cliente. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  if (!isGoogleAdsEnabled()) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { clientId } = await params;
  const { tenant } = await getAppContext();
  const client = await getClientBySlugOrId(tenant.id, clientId);
  if (!client) {
    return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));
  const digits = body.customerId ? body.customerId.replace(/\D/g, "") : "";
  const loginDigits = body.loginCustomerId
    ? body.loginCustomerId.replace(/\D/g, "")
    : "";

  const { client: clientRepo } = await repositories();
  const previous = client.googleAdsCustomerId ?? "";
  client.googleAdsCustomerId = digits || null;
  client.googleAdsLoginCustomerId = digits ? loginDigits || digits : null;
  await clientRepo.save(client);

  // Backfill inicial quando uma conta nova é vinculada (fire-and-forget).
  if (digits && digits !== previous) {
    const { syncGoogleAdsForClient } = await import("@/lib/google-ads-sync");
    void syncGoogleAdsForClient(tenant.id, client.id, { days: 30 }).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    linkedCustomerId: client.googleAdsCustomerId,
    linkedLoginCustomerId: client.googleAdsLoginCustomerId
  });
}
