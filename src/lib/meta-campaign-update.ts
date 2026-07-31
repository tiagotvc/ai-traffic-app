import type { ClientMetaSettings } from "@/db/entities/ClientMetaSettings";
import type { CampaignDraftPayload } from "@/lib/campaign-draft";
import { resolveAdTargetAdsets } from "@/lib/campaign-draft";
import {
  createCreativeForAd,
  normalizeAdAccountId,
  resolveAdsetTargeting
} from "@/lib/meta-campaign";
import { resolveCtaForObjective } from "@/lib/meta-cta";
import {
  fetchInstagramAccountsForAdAccount,
  updateAdFields,
  updateAdSetFields,
  updateCampaignFields
} from "@/lib/meta-graph";

export type EntityUpdateResult = {
  level: "campaign" | "adset" | "ad";
  metaId: string;
  name: string;
  /** Campos efetivamente enviados à Meta. Vazio = nada mudou nesta entidade. */
  changed: string[];
  error?: string;
};

/** Data local (YYYY-MM-DDTHH:mm) → ISO aceito pela Meta. Vazio vira null (sem limite). */
function toMetaTime(value: string | null | undefined): string | null | undefined {
  const raw = value?.trim();
  if (raw === undefined) return undefined;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Aplica um rascunho em modo edição sobre a campanha já publicada.
 *
 * Só toca no que a Meta aceita alterar depois da criação. Fora do alcance, por
 * decisão da própria API: `objective` da campanha, `billing_event` e
 * `optimization_goal` do conjunto depois que ele começa a entregar, e o conteúdo
 * de um criativo — para texto/imagem de anúncio criamos um criativo novo e
 * apontamos o anúncio para ele, o que reinicia o aprendizado.
 *
 * Cada entidade é atualizada de forma independente: um erro em um anúncio não
 * impede os demais, e volta em `error` no resultado daquela entidade.
 */
export async function applyDraftToPublishedCampaign(input: {
  accessToken: string;
  adAccountId: string;
  draft: CampaignDraftPayload;
  settings?: ClientMetaSettings;
  tenantId?: string;
  userId?: string;
}): Promise<{ results: EntityUpdateResult[] }> {
  const { accessToken, draft, settings } = input;
  const actId = normalizeAdAccountId(input.adAccountId);
  const campaignMetaId = draft.meta?.targetMetaCampaignId?.trim();
  if (!campaignMetaId) {
    throw new Error("Rascunho sem campanha de destino — não é um rascunho de edição.");
  }

  const results: EntityUpdateResult[] = [];

  // ---- Campanha -----------------------------------------------------------
  const campaignFields = {
    name: draft.campaign.name.trim() || undefined,
    dailyBudgetMinorUnits:
      draft.campaign.budgetLevel === "campaign"
        ? Math.round(draft.campaign.dailyBudgetBRL * 100)
        : undefined
  };
  try {
    await updateCampaignFields(accessToken, campaignMetaId, campaignFields);
    results.push({
      level: "campaign",
      metaId: campaignMetaId,
      name: draft.campaign.name,
      changed: Object.entries(campaignFields)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k)
    });
  } catch (err) {
    results.push({
      level: "campaign",
      metaId: campaignMetaId,
      name: draft.campaign.name,
      changed: [],
      error: err instanceof Error ? err.message : String(err)
    });
  }

  // ---- Conjuntos ----------------------------------------------------------
  for (const adset of draft.adsets) {
    const metaId = adset.metaAdsetId?.trim();
    // Conjunto sem id da Meta é novo no rascunho — criar é outro fluxo, não o de edição.
    if (!metaId) continue;

    try {
      const targeting = await resolveAdsetTargeting(adset, settings, {
        tenantId: input.tenantId,
        userId: input.userId,
        metaAccessToken: accessToken,
        adAccountId: input.adAccountId
      });
      const fields = {
        name: adset.name.trim() || undefined,
        targeting,
        startTime: toMetaTime(adset.schedule?.start),
        endTime: toMetaTime(adset.schedule?.end),
        dailyBudgetMinorUnits:
          draft.campaign.budgetLevel === "adset"
            ? Math.round(draft.campaign.dailyBudgetBRL * 100)
            : undefined
      };
      await updateAdSetFields(accessToken, metaId, fields);
      results.push({
        level: "adset",
        metaId,
        name: adset.name,
        changed: Object.entries(fields)
          .filter(([, v]) => v !== undefined)
          .map(([k]) => k)
      });
    } catch (err) {
      results.push({
        level: "adset",
        metaId,
        name: adset.name,
        changed: [],
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // ---- Anúncios -----------------------------------------------------------
  const allowedInstagramActorIds = (
    await fetchInstagramAccountsForAdAccount(accessToken, input.adAccountId).catch(() => [])
  ).map((a) => a.id);

  for (const ad of draft.ads) {
    const metaId = ad.metaAdId?.trim();
    if (!metaId) continue;

    try {
      const adset = resolveAdTargetAdsets(draft, ad)[0] ?? draft.adsets[0]!;
      const changed: string[] = ["name"];

      // Reaproveitar o criativo publicado significa "não mexi no criativo" — só
      // gera um novo quando o usuário de fato editou texto/mídia/destino.
      let creativeId: string | undefined;
      if (!ad.reuseMetaCreative) {
        const created = await createCreativeForAd({
          token: accessToken,
          actId,
          campaignName: draft.campaign.name,
          adset,
          ad,
          adName: ad.name.trim() || draft.campaign.name,
          objective: draft.objective,
          pageId: ad.pageId,
          linkUrl: ad.linkUrl,
          cta: resolveCtaForObjective(draft.objective, ad.callToAction.trim() || "LEARN_MORE"),
          settings,
          allowedInstagramActorIds
        });
        creativeId = created.creativeId;
        changed.push("creative");
      }

      await updateAdFields(accessToken, metaId, {
        name: ad.name.trim() || undefined,
        creativeId
      });
      results.push({ level: "ad", metaId, name: ad.name, changed });
    } catch (err) {
      results.push({
        level: "ad",
        metaId,
        name: ad.name,
        changed: [],
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return { results };
}
