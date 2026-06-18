import { NextResponse } from "next/server";
import { In } from "typeorm";

import { repositories } from "@/db/repositories";
import { getAppContext, listClientsForTenant, slugify } from "@/lib/app-context";
import { fetchCustomAudiences, type MetaCustomAudience } from "@/lib/meta-graph";

const CACHE_TTL_MS = 30 * 60 * 1000;

type LookalikeSpec = { country?: string; ratio?: number; type?: string };

function parseLookalikeSpec(spec: unknown): LookalikeSpec {
  if (!spec) return {};
  try {
    const obj = typeof spec === "string" ? JSON.parse(spec) : spec;
    if (obj && typeof obj === "object") return obj as LookalikeSpec;
  } catch {
    /* ignore */
  }
  return {};
}

function audienceKind(subtype?: string) {
  const s = (subtype ?? "").toUpperCase();
  if (s.includes("LOOKALIKE")) return "lookalike";
  if (s.includes("ENGAGEMENT")) return "engagement";
  if (s === "CUSTOM" || s.includes("WEB")) return "custom";
  if (s.includes("APP")) return "app";
  return "custom";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const adAccountIdParam = url.searchParams.get("adAccountId")?.trim() ?? "";
  const clientSlugParam = url.searchParams.get("clientId")?.trim() ?? "";
  const { tenant, metaAccessToken } = await getAppContext();
  const clients = await listClientsForTenant(tenant.id);
  const clientIds = clients.map((c) => c.id);

  const {
    adAccount: adAccountRepo,
    clientMetaSettings: settingsRepo,
    lookalikeJob: jobRepo,
    metaAudienceCache: cacheRepo,
    campaignTemplate: templateRepo
  } = await repositories();

  const accounts = clientIds.length
    ? await adAccountRepo.find({ where: { clientId: In(clientIds) } })
    : [];
  const settingsRows = clientIds.length
    ? await settingsRepo.find({ where: { clientId: In(clientIds) } })
    : [];
  const settingsByClient = new Map(settingsRows.map((s) => [s.clientId, s]));

  const clientPayload = clients.map((c) => {
    const settings = settingsByClient.get(c.id);
    const linked = accounts
      .filter((a) => a.clientId === c.id)
      .map((a) => ({
        metaAdAccountId: a.metaAdAccountId,
        label: a.label ?? a.metaAdAccountId
      }));
    const defaultAdAccountId =
      settings?.defaultAdAccountId ?? linked[0]?.metaAdAccountId ?? null;
    return {
      id: c.id,
      slug: slugify(c.name),
      name: c.name,
      metaPixelId: settings?.metaPixelId ?? null,
      defaultAdAccountId,
      adAccounts: linked,
      defaultCustomAudienceIds: settings?.defaultCustomAudienceIds ?? [],
      defaultExcludedAudienceIds: settings?.defaultExcludedAudienceIds ?? []
    };
  });

  const audiencesByAccount: Record<string, MetaCustomAudience[]> = {};

  if (metaAccessToken && adAccountIdParam) {
    const linked = accounts.some((a) => a.metaAdAccountId === adAccountIdParam);
    if (!linked) {
      return NextResponse.json(
        { ok: false, error: "Conta de anúncios não vinculada a este workspace" },
        { status: 403 }
      );
    }
    if (clientSlugParam) {
      const client = clients.find((c) => slugify(c.name) === clientSlugParam);
      const clientLinked = client
        ? accounts.some((a) => a.clientId === client.id && a.metaAdAccountId === adAccountIdParam)
        : false;
      if (!clientLinked) {
        return NextResponse.json(
          { ok: false, error: "Conta não vinculada ao cliente selecionado" },
          { status: 403 }
        );
      }
    }
    try {
      if (!refresh) {
        const cached = await cacheRepo.findOne({ where: { metaAdAccountId: adAccountIdParam } });
        if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
          audiencesByAccount[adAccountIdParam] = (cached.audiences ?? []) as MetaCustomAudience[];
        }
      }
      if (!audiencesByAccount[adAccountIdParam]) {
        const audiences = await fetchCustomAudiences(metaAccessToken, adAccountIdParam);
        audiencesByAccount[adAccountIdParam] = audiences;
        const cached = await cacheRepo.findOne({ where: { metaAdAccountId: adAccountIdParam } });
        if (cached) {
          cached.audiences = audiences;
          cached.fetchedAt = new Date();
          await cacheRepo.save(cached);
        } else {
          await cacheRepo.save(
            cacheRepo.create({
              metaAdAccountId: adAccountIdParam,
              audiences,
              fetchedAt: new Date()
            })
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao buscar públicos na Meta";
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  const accountToClient = new Map<string, { slug: string; name: string; clientId: string }>();
  for (const a of accounts) {
    const c = clients.find((cl) => cl.id === a.clientId);
    if (c) {
      accountToClient.set(a.metaAdAccountId, {
        slug: slugify(c.name),
        name: c.name,
        clientId: c.id
      });
    }
  }

  const savedAudiences: Array<{
    id: string;
    name: string;
    kind: string;
    subtype?: string;
    clientName: string;
    clientSlug: string;
    clientId: string;
    adAccountId: string;
    sourceLabel: string;
    country?: string;
    ratioPct?: number;
    updatedAt: string;
    approximateCount?: number;
  }> = [];

  for (const [adAccountId, list] of Object.entries(audiencesByAccount)) {
    const clientInfo = accountToClient.get(adAccountId);
    if (!clientInfo) continue;
    const settings = settingsByClient.get(clientInfo.clientId);
    const pixelLabel = settings?.metaPixelId
      ? `Pixel — ${clientInfo.name}`
      : `Conta — ${clientInfo.name}`;

    for (const a of list) {
      const spec = parseLookalikeSpec(a.lookalike_spec);
      const ratioPct = spec.ratio != null ? Math.round(spec.ratio * 100) : undefined;
      savedAudiences.push({
        id: a.id,
        name: a.name ?? a.id,
        kind: audienceKind(a.subtype),
        subtype: a.subtype,
        clientName: clientInfo.name,
        clientSlug: clientInfo.slug,
        clientId: clientInfo.clientId,
        adAccountId,
        sourceLabel: pixelLabel,
        country: spec.country ?? "BR",
        ratioPct,
        updatedAt: new Date().toISOString(),
        approximateCount: a.approximate_count
      });
    }
  }

  savedAudiences.sort((a, b) => a.name.localeCompare(b.name));

  const jobs = clientIds.length
    ? await jobRepo.find({
        where: { clientId: In(clientIds) },
        order: { createdAt: "DESC" },
        take: 50
      })
    : [];

  const lookalikeJobs = jobs.map((j) => {
    const c = clients.find((cl) => cl.id === j.clientId);
    return {
      id: j.id,
      name: j.name,
      status: j.status,
      clientSlug: c ? slugify(c.name) : "",
      clientName: c?.name ?? "",
      adAccountId: j.metaAdAccountId,
      ratioPct: Math.round(Number(j.ratio) * 100),
      country: j.country,
      metaAudienceId: j.metaAudienceId,
      createdAt: j.createdAt.toISOString(),
      lastError: j.lastError
    };
  });

  const templates = await templateRepo.find({
    where: { tenantId: tenant.id },
    order: { createdAt: "DESC" },
    take: 20
  });

  const templateGroups = clientPayload.map((c) => {
    const count = templates.filter((t) => !t.clientId || t.clientId === c.id).length;
    const settings = settingsByClient.get(c.id);
    return {
      clientSlug: c.slug,
      clientName: c.name,
      templateCount: count,
      pixelId: settings?.metaPixelId ?? null,
      objective: settings?.defaultObjective ?? "leads"
    };
  });

  return NextResponse.json({
    ok: true,
    metaConnected: !!metaAccessToken,
    clients: clientPayload,
    audiencesByAccount,
    savedAudiences,
    lookalikeJobs,
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      clientId: t.clientId,
      createdAt: t.createdAt.toISOString()
    })),
    templateGroups
  });
}
