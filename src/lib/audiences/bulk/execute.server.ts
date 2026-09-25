import "server-only";

import { buildAudienceDescription, createWithDescriptionFallback } from "@/lib/audience-provenance";
import { createEngagementCustomAudience } from "@/lib/meta-audience-create";
import { formatMetaGraphError } from "@/lib/meta-error";
import { createLookalikeAudience, metaFetch } from "@/lib/meta-graph";

import { markDuplicates, planBulkAudiences } from "./builders";
import type {
  BulkAudienceConfig,
  BulkAudienceItemResult,
  PlannedAudience,
  PlannedAudienceWithStatus
} from "./types";

/**
 * AudienceCreationQueue (lado servidor): monta o plano autoritativo, checa
 * duplicidade contra a conta e cria cada público na Meta.
 */

export type AccountAudience = {
  id: string;
  name: string;
  subtype?: string;
  approximateCount?: number;
};

/** Pausa entre criações para não estourar o rate limit da conta. */
const CREATE_DELAY_MS = 400;
const MAX_PAGES = 20;

function actId(adAccountId: string): string {
  return adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
}

/**
 * Todos os públicos da conta, paginando. `fetchCustomAudiences` só traz os
 * 100 primeiros, o que deixaria a checagem de duplicidade cega em contas
 * grandes (justamente as que usam criação em lote).
 */
export async function fetchAllAccountAudiences(
  accessToken: string,
  adAccountId: string
): Promise<AccountAudience[]> {
  const out: AccountAudience[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({
      fields: "id,name,subtype,approximate_count_upper_bound",
      limit: "500"
    });
    if (after) qs.set("after", after);
    const res = await metaFetch<{
      data?: Array<{
        id: string;
        name?: string;
        subtype?: string;
        approximate_count_upper_bound?: number;
      }>;
      paging?: { cursors?: { after?: string }; next?: string };
    }>(`/${encodeURIComponent(actId(adAccountId))}/customaudiences?${qs}`, accessToken);
    for (const a of res.data ?? []) {
      out.push({
        id: a.id,
        name: a.name ?? a.id,
        subtype: a.subtype,
        approximateCount:
          a.approximate_count_upper_bound != null && a.approximate_count_upper_bound >= 0
            ? a.approximate_count_upper_bound
            : undefined
      });
    }
    after = res.paging?.next ? res.paging.cursors?.after : undefined;
    if (!after) break;
  }
  return out;
}

export function isLookalikeAudience(a: Pick<AccountAudience, "subtype">): boolean {
  return (a.subtype ?? "").toUpperCase().includes("LOOKALIKE");
}

export async function resolveBulkPlan(
  accessToken: string,
  adAccountId: string,
  config: BulkAudienceConfig
): Promise<{ plan: PlannedAudienceWithStatus[]; missingSeedIds: string[] }> {
  const audiences = await fetchAllAccountAudiences(accessToken, adAccountId);

  // Público-base precisa existir nesta conta e não pode ser outro lookalike.
  const seedNames = new Map<string, string>();
  for (const a of audiences) {
    if (!isLookalikeAudience(a)) seedNames.set(a.id, a.name);
  }
  const missingSeedIds =
    config.kind === "lookalike"
      ? config.seeds.map((s) => s.id).filter((id) => !seedNames.has(id))
      : [];

  const plan = markDuplicates(
    planBulkAudiences(config, seedNames),
    audiences.map((a) => a.name)
  );
  return { plan, missingSeedIds };
}

async function createOne(
  accessToken: string,
  adAccountId: string,
  item: PlannedAudience,
  clientName: string
): Promise<{ id: string }> {
  if (item.kind === "video_view") {
    const eventName = `video_view_${item.percent}`;
    const description = buildAudienceDescription({
      clientName,
      kind: "engagement",
      detail: [
        "Origem: Vídeo",
        `Evento: ${eventName}`,
        `Retenção: ${item.retentionDays} dias`,
        "Criador em lote"
      ]
    });
    return createWithDescriptionFallback(
      (desc) =>
        createEngagementCustomAudience(accessToken, adAccountId, {
          name: item.name,
          sourceType: "video",
          sourceIds: [item.videoId],
          eventName,
          retentionDays: item.retentionDays,
          description: desc
        }),
      description
    );
  }

  const description = buildAudienceDescription({
    clientName,
    kind: "lookalike",
    detail: [
      `Semelhança: ${item.ratioPercent}%`,
      `País: ${item.country}`,
      `Origem: ${item.seedName}`,
      "Criador em lote"
    ]
  });
  return createWithDescriptionFallback(
    (desc) =>
      createLookalikeAudience(accessToken, adAccountId, {
        name: item.name,
        originAudienceId: item.seedId,
        ratio: item.ratioPercent / 100,
        country: item.country,
        description: desc
      }),
    description
  );
}

/**
 * Cria um trecho do plano. Recebe os itens já revalidados pelo servidor
 * (nunca nomes vindos do navegador) e devolve um resultado por item, sem
 * abortar o lote quando um deles falha.
 */
export async function executeBulkChunk(
  accessToken: string,
  adAccountId: string,
  items: PlannedAudienceWithStatus[],
  clientName: string
): Promise<BulkAudienceItemResult[]> {
  const results: BulkAudienceItemResult[] = [];
  let createdAny = false;
  for (const item of items) {
    if (item.skip) {
      results.push({ key: item.key, name: item.name, status: "skipped", reason: item.skip });
      continue;
    }
    if (createdAny) await new Promise((r) => setTimeout(r, CREATE_DELAY_MS));
    createdAny = true;
    try {
      const created = await createOne(accessToken, adAccountId, item, clientName);
      results.push({ key: item.key, name: item.name, status: "created", audienceId: created.id });
    } catch (e) {
      results.push({
        key: item.key,
        name: item.name,
        status: "error",
        error: formatMetaGraphError(e)
      });
    }
  }
  return results;
}
