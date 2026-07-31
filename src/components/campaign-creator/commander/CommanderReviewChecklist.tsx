"use client";

import { CheckCircle2, Circle, Lightbulb, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { CommanderVerdictCard } from "@/components/commander/CommanderVerdictCard";
import { useCommanderVerdict } from "@/components/commander/useCommanderVerdict";
import { useCommanderAccess } from "@/hooks/useCommanderAccess";
import { getActiveAd, getActiveAdset, type CampaignDraftPayload } from "@/lib/campaign-draft";
import { commanderService } from "@/lib/commander/commander-service";
import { buildCommanderReviewChecklist, buildCommanderReviewOpportunities } from "@/lib/commander/review-checklist";

import { CommanderConfidenceBadge } from "./CommanderParts";

/** Resumo textual de tudo que foi preenchido — vira o contexto do veredito de IA. */
function buildVerdictContext(payload: CampaignDraftPayload): string {
  const adset = getActiveAdset(payload);
  const ad = getActiveAd(payload);
  const mediaCount = ad.imageHashes.length + ad.videoIds.length;
  return [
    `Objetivo: ${payload.objective}`,
    `Nome da campanha: ${payload.campaign.name || "não definido"}`,
    `Orçamento diário: R$ ${payload.campaign.dailyBudgetBRL.toFixed(2)}`,
    `Conjunto ativo: ${adset.name || "não definido"}`,
    `Segmentação: idade ${adset.targeting.ageMin}-${adset.targeting.ageMax}, ` +
      `${adset.targeting.customAudienceIds.length ? "com" : "sem"} público personalizado, ` +
      `${adset.targeting.interests.length} interesse(s)`,
    `Criativo dinâmico: ${adset.dynamicCreative ? "ativado" : "desativado"}`,
    adset.pixelId
      ? `Conversão: pixel configurado, evento "${adset.conversionEvent || "não definido"}"`
      : "Conversão: pixel não configurado",
    `Anúncio ativo: ${ad.name || "não definido"}, ${mediaCount > 0 ? "com mídia" : "sem mídia"}, ` +
      `${ad.titles.filter(Boolean).length} título(s), ${ad.bodies.filter(Boolean).length} texto(s)`,
    `Total no rascunho: ${payload.adsets.length} conjunto(s), ${payload.ads.length} anúncio(s)`
  ].join("\n");
}

/**
 * Checklist inteligente da revisão final. Estritamente local/síncrono — não usa
 * useCommanderState (evita abrir um segundo stream SSE concorrente com o painel
 * lateral, que já roda os Scientists em tempo real quando habilitado). O veredito de
 * IA, por outro lado, roda sob demanda aqui (uma vez, ao entrar na revisão).
 */
export function CommanderReviewChecklist() {
  const { commander } = useCommanderAccess();
  const { payload } = useCampaignDraft();

  const checklist = useMemo(() => buildCommanderReviewChecklist(payload), [payload]);
  const opportunities = useMemo(() => buildCommanderReviewOpportunities(payload), [payload]);
  const confidence = useMemo(() => commanderService.analyzeCampaignDraft(payload).confidence, [payload]);

  const { verdict, loading, error, retry } = useCommanderVerdict({
    domain: "campaign",
    clientSlug: payload.clientSlug,
    enabled: commander,
    buildContext: () => ({
      contextSummary: buildVerdictContext(payload),
      checklist: [
        ...checklist,
        ...opportunities.map((o) => ({ label: `Oportunidade: ${o.title} — ${o.description}`, complete: false }))
      ]
    })
  });

  if (!commander) return null;

  return (
    <section className="campaign-creator-sidebar-card" aria-label="Checklist do Orion Commander">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Sparkles size={17} />
          </span>
          <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
            Checklist do Commander
          </h3>
        </div>
        <CommanderConfidenceBadge value={confidence} />
      </div>

      <div className="mt-3">
        <CommanderVerdictCard verdict={verdict} loading={loading} error={error} onRetry={retry} />
      </div>

      <div className="mt-3 space-y-1.5">
        {checklist.map((item) => (
          <div
            key={item.key}
            className={`campaign-creator-summary-checklist-item ${
              item.complete
                ? "campaign-creator-summary-checklist-item--complete"
                : "campaign-creator-summary-checklist-item--incomplete"
            }`}
          >
            {item.complete ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>

      {opportunities.length > 0 ? (
        <div className="mt-4">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-dimmer)]">
            Oportunidades
          </h4>
          <div className="space-y-2">
            {opportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className="flex gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-2.5"
              >
                <Lightbulb size={14} className="mt-0.5 shrink-0 text-[var(--ui-accent)]" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--text-main)]">{opportunity.title}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-[var(--text-dim)]">
                    {opportunity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
