import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext, listClientsForTenant, slugify } from "@/lib/app-context";
import { getAppShellContext } from "@/lib/app-shell-context";
import { buildClientListCards, clientsListCacheKeyPrefix, invalidateClientsListCache } from "@/lib/clients-list";
import {
  applyClientMetaSettings,
  linkAllBmAccountsToClient,
  linkClientMetaAccounts
} from "@/lib/link-client-meta";
import { listTenantPages } from "@/lib/meta-discover";
import { parsePeriodFromSearchParams } from "@/lib/report-period";
import { redisGetJson, redisSetJson } from "@/lib/redis-cache";
import { enqueueTenantSync, SyncNoAccountsError } from "@/lib/sync-queue";

const CLIENTS_CACHE_TTL_SEC = 60;

// Criar cliente faz descoberta sob demanda da BM (poucas chamadas Meta) — dá folga.
export const maxDuration = 60;

const CreateClientSchema = z.object({
  name: z.string().min(1).max(120),
  metaBusinessId: z.string().optional(),
  metaBusinessName: z.string().optional(),
  metaAdAccountIds: z.array(z.string().min(1)).optional(),
  metaPageId: z.string().min(1).optional(),
  metaPixelId: z.string().optional(),
  linkedMetaPixelIds: z.array(z.string()).optional(),
  /** Conta Google Ads vinculada na criação (opcional, só dígitos). */
  googleAdsCustomerId: z.string().nullable().optional(),
  /** Fluxo simplificado: ao vincular a BM, puxa automaticamente todos os ativos dela. */
  linkAllBmAssets: z.boolean().optional()
});

export async function POST(req: Request) {
  const { tenant, metaAccessToken, user } = await getAppContext();
  const body = CreateClientSchema.parse(await req.json().catch(() => ({})));

  try {
    const { assertLimit } = await import("@/lib/billing/entitlements");
    await assertLimit(tenant.id, "maxClients");
  } catch (err) {
    const { billingErrorResponse } = await import("@/lib/billing/api-errors");
    const res = billingErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const { client: clientRepo, clientGoal: goalRepo } = await repositories();

  const saved = await clientRepo.save(
    clientRepo.create({
      tenantId: tenant.id,
      name: body.name.trim(),
      metaPageId: body.metaPageId?.trim() || null,
      metaLinkUrl: null,
      metaBusinessId:
        body.metaBusinessId && body.metaBusinessId !== "unassigned"
          ? body.metaBusinessId
          : null
    })
  );

  await goalRepo.save(
    goalRepo.create({ clientId: saved.id, objective: "leads", enabled: false, windowDays: 1 })
  );

  // Vínculo Google Ads opcional (gated pelo kill-switch — ignora se a flag estiver off).
  const { isGoogleAdsEnabled } = await import("@/lib/google-env");
  if (isGoogleAdsEnabled() && body.googleAdsCustomerId) {
    saved.googleAdsCustomerId = body.googleAdsCustomerId.replace(/\D/g, "") || null;
    await clientRepo.save(saved);
  }

  const normalizedBm =
    body.metaBusinessId && body.metaBusinessId !== "unassigned" ? body.metaBusinessId : null;
  const explicitIds = body.metaAdAccountIds ?? [];

  // Fluxo simplificado: BM definida e sem seleção manual de contas → puxa todas as contas da BM.
  const pullAllFromBm = !!normalizedBm && (body.linkAllBmAssets || explicitIds.length === 0);

  let defaultAdAccountId: string | null = null;
  let autoMetaPageId: string | null = null;
  let linkedAccountDbIds: string[] = [];

  if (pullAllFromBm && normalizedBm) {
    const { linked, accountOptions } = await linkAllBmAccountsToClient({
      tenantId: tenant.id,
      clientId: saved.id,
      metaBusinessId: normalizedBm,
      metaBusinessName: body.metaBusinessName,
      metaAccessToken
    });
    defaultAdAccountId =
      accountOptions[0]?.metaAdAccountId ?? linked[0]?.metaAdAccountId ?? null;
    linkedAccountDbIds = linked.map((a) => a.id);

    const bmPages = await listTenantPages(tenant.id, normalizedBm);
    if (bmPages.length === 1 && !body.metaPageId) {
      autoMetaPageId = bmPages[0].metaPageId;
    }
  } else if (explicitIds.length > 0) {
    const linked = await linkClientMetaAccounts({
      tenantId: tenant.id,
      clientId: saved.id,
      metaAdAccountIds: explicitIds,
      metaAccessToken,
      metaBusinessId: normalizedBm
    });
    defaultAdAccountId = explicitIds[0] ?? null;
    linkedAccountDbIds = linked.map((a) => a.id);
  }

  const linkedPixelIds =
    body.linkedMetaPixelIds?.map((id) => id.trim()).filter(Boolean) ??
    (body.metaPixelId?.trim() ? [body.metaPixelId.trim()] : []);

  await applyClientMetaSettings({
    client: saved,
    metaPageId: body.metaPageId ?? autoMetaPageId ?? saved.metaPageId,
    linkedMetaPixelIds: linkedPixelIds,
    metaPixelId: linkedPixelIds[0] ?? body.metaPixelId ?? null,
    defaultAdAccountId
  });

  await invalidateClientsListCache(tenant.id);

  let syncStarted = false;
  if (metaAccessToken && linkedAccountDbIds.length > 0) {
    try {
      await enqueueTenantSync({
        tenantId: tenant.id,
        defaultClientId: saved.id,
        clientId: saved.id,
        adAccountIds: linkedAccountDbIds,
        metaAccessToken,
        manual: false,
        triggeredByUserId: user.id
      });
      syncStarted = true;
    } catch (err) {
      if (!(err instanceof SyncNoAccountsError)) {
        console.warn("[clients] auto-sync after create failed:", err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    syncStarted,
    client: { id: saved.id, slug: slugify(saved.name), name: saved.name }
  });
}

export async function GET(req: Request) {
  const { tenant } = await getAppShellContext();
  const url = new URL(req.url);
  const clients = await listClientsForTenant(tenant.id);

  if (url.searchParams.get("minimal") === "1") {
    return NextResponse.json({
      ok: true,
      clients: clients.map((c) => ({
        id: c.id,
        slug: slugify(c.name),
        name: c.name
      }))
    });
  }

  const period = parsePeriodFromSearchParams(url);
  const periodKey = url.searchParams.get("period") ?? "custom";
  const cacheKey = `${clientsListCacheKeyPrefix(tenant.id)}${periodKey}:${period.since ?? "all"}:${period.until ?? "all"}`;

  const cached = await redisGetJson<{ clients: Awaited<ReturnType<typeof buildClientListCards>> }>(
    cacheKey
  );
  if (cached) {
    return NextResponse.json(
      { ok: true, clients: cached.clients },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const result = await buildClientListCards(tenant.id, clients, period);
  void redisSetJson(cacheKey, { clients: result }, CLIENTS_CACHE_TTL_SEC);

  return NextResponse.json({ ok: true, clients: result });
}
