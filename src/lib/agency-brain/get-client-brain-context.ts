import "server-only";

import { repositories } from "@/db/repositories";
import { getClientDna } from "@/lib/agency-brain/dna-builder";
import { listApprovedLearnings } from "@/lib/agency-brain/client-learning-service";
import type { ClientBrainContext, LearningDto } from "@/lib/agency-brain/types";
import {
  aggregateCreativesFromAccountData,
  getTopCreativesByPreset,
  mapAggregatesToCreatives,
  rankedCreativesFromGroups,
  type CreativeAgg,
  type RankedCreative
} from "@/lib/agency-brain/creative-intelligence";
import { fetchAllAccountCreatives } from "@/lib/creatives-access";
import { getAllTenantMetaTokens } from "@/lib/meta-auth-store";
import { loadRankConfig } from "@/lib/ranking-config";
import { rollingDaysEndingYesterday } from "@/lib/report-period";
import { slugify } from "@/lib/app-context";

function buildSummaryText(learnings: LearningDto[]): string {
  if (!learnings.length) {
    return "Ainda não há aprendizados aprovados registrados para este cliente.";
  }

  const high = learnings.filter((l) => l.impact === "HIGH").slice(0, 3);
  const creative = learnings.filter((l) => l.category === "CREATIVE").slice(0, 2);
  const audience = learnings.filter((l) => l.category === "AUDIENCE").slice(0, 2);
  const negative = learnings.filter((l) => (l.tags ?? []).includes("negative")).slice(0, 1);

  const parts: string[] = [];

  if (creative.length) {
    parts.push(
      `Criativos: ${creative.map((l) => l.title.replace(/\.$/, "")).join("; ")}.`
    );
  }
  if (audience.length) {
    parts.push(
      `Públicos: ${audience.map((l) => l.title.replace(/\.$/, "")).join("; ")}.`
    );
  }
  if (high.length) {
    parts.push(
      `Alto impacto: ${high.map((l) => l.title.replace(/\.$/, "")).join("; ")}.`
    );
  }
  if (negative.length) {
    parts.push(`Evitar: ${negative[0]!.description.slice(0, 120)}.`);
  }

  return parts.length
    ? `Para este cliente, ${parts.join(" ")}`
    : learnings
        .slice(0, 5)
        .map((l) => l.title)
        .join(". ") + ".";
}

async function loadTopCreatives(
  tenantId: string,
  clientId: string,
  clientSlug: string
): Promise<RankedCreative[]> {
  try {
    const tokens = await getAllTenantMetaTokens(tenantId);
    if (!tokens.length) return [];

    const { adAccount: adAccountRepo, campaignPreset: presetRepo } = await repositories();
    const accounts = await adAccountRepo.find({ where: { clientId } });
    if (!accounts.length) return [];

    const period = rollingDaysEndingYesterday(7);
    const presetRows = await presetRepo.find({ where: { tenantId } });
    const presetByCampaign = new Map(presetRows.map((r) => [r.metaCampaignId, r.preset]));
    const rankConfig = await loadRankConfig(tenantId);

    const { results } = await fetchAllAccountCreatives(accounts, {
      tokens,
      since: period.since,
      until: period.until,
      tenantId,
      clientId
    });

    const byCreative = new Map<string, CreativeAgg>();
    for (const { ads, insights } of results) {
      aggregateCreativesFromAccountData({
        ads,
        insights,
        clientSlug,
        presetByCampaign,
        into: byCreative
      });
    }

    const creatives = mapAggregatesToCreatives(byCreative, clientSlug, presetByCampaign);
    const groups = getTopCreativesByPreset(creatives, rankConfig);
    return rankedCreativesFromGroups(groups).filter((c) => c.tier !== "no_spend").slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * Contexto estruturado do Agency Brain para prompts de IA.
 * Usar em /api/ai/recommendations e agentes futuros.
 */
export async function getClientBrainContext(
  tenantId: string,
  clientId: string
): Promise<ClientBrainContext> {
  const approved = await listApprovedLearnings(tenantId, clientId, 100);
  const dna = await getClientDna(tenantId, clientId);
  const { client: clientRepo } = await repositories();
  const client = await clientRepo.findOne({ where: { id: clientId, tenantId } });

  const creativeLearnings = approved.filter((l) => l.category === "CREATIVE");
  const audienceLearnings = approved.filter((l) => l.category === "AUDIENCE");
  const offerLearnings = approved.filter((l) => l.category === "OFFER");
  const negativeLearnings = approved.filter(
    (l) =>
      (l.tags ?? []).includes("negative") ||
      l.category === "GENERAL" ||
      l.evidence?.ruleId === "spend_no_conversion"
  );
  const highImpactLearnings = approved.filter((l) => l.impact === "HIGH");
  const recentLearnings = approved.slice(0, 10);

  const topLearnings = [...approved]
    .sort((a, b) => {
      const impactScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return impactScore[b.impact] - impactScore[a.impact];
    })
    .slice(0, 10);

  const tagSet = new Set<string>();
  for (const l of approved) {
    for (const t of l.tags ?? []) tagSet.add(t);
  }

  const clientSlug = client ? slugify(client.name) : "";
  const topCreatives = client ? await loadTopCreatives(tenantId, clientId, clientSlug) : [];

  let summaryText = buildSummaryText(approved);
  if (topCreatives.length) {
    const names = topCreatives
      .slice(0, 3)
      .map((c) => c.name)
      .join(", ");
    summaryText = `${summaryText} Top criativos (7d): ${names}.`;
  }
  if (dna?.summaryText) {
    summaryText = `${summaryText} DNA: ${dna.summaryText.slice(0, 250)}`;
  }
  if (client?.aiContext && typeof client.aiContext === "string" && client.aiContext.trim()) {
    summaryText = `${summaryText} Contexto adicional: ${client.aiContext.trim().slice(0, 300)}`;
  } else if (client?.aiContext && typeof client.aiContext === "object") {
    const ctx = JSON.stringify(client.aiContext).slice(0, 200);
    if (ctx.length > 2) summaryText = `${summaryText} Contexto adicional: ${ctx}`;
  }

  return {
    clientId,
    topLearnings,
    creativeLearnings,
    audienceLearnings,
    offerLearnings,
    negativeLearnings,
    recentLearnings,
    highImpactLearnings,
    tags: [...tagSet],
    summaryText,
    dna,
    topCreatives
  };
}
