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

const GENDER_LABEL: Record<string, string> = {
  all: "todos os gêneros",
  male: "homens",
  female: "mulheres"
};

/** Resumo textual de tudo que foi preenchido — vira o contexto do veredito de IA. */
function buildVerdictContext(payload: CampaignDraftPayload): string {
  const adset = getActiveAdset(payload);
  const ad = getActiveAd(payload);
  const mediaCount = ad.imageHashes.length + ad.videoIds.length;
  const titles = ad.titles.filter(Boolean);
  const bodies = ad.bodies.filter(Boolean);
  const interestLabels = adset.targeting.interests.map((i) => i.label).filter(Boolean);
  const genderLabel = GENDER_LABEL[adset.targeting.gender] ?? adset.targeting.gender;

  return [
    `Objetivo: ${payload.objective}`,
    `Nome da campanha: ${payload.campaign.name || "não definido"}`,
    `Orçamento diário: R$ ${payload.campaign.dailyBudgetBRL.toFixed(2)}`,
    `Conjunto ativo: ${adset.name || "não definido"}`,
    `Criativo dinâmico: ${adset.dynamicCreative ? "ativado" : "desativado"}`,
    adset.pixelId
      ? `Conversão: pixel configurado, evento "${adset.conversionEvent || "não definido"}"`
      : "Conversão: pixel não configurado",
    "",
    "== Público-alvo desse anúncio ==",
    `Idade: ${adset.targeting.ageMin}-${adset.targeting.ageMax} anos`,
    `Gênero: ${genderLabel}`,
    interestLabels.length ? `Interesses: ${interestLabels.join(", ")}` : "Interesses: nenhum configurado",
    adset.targeting.customAudienceIds.length
      ? "Usa público personalizado (remarketing/lookalike)"
      : "Sem público personalizado",
    "",
    "== Texto do anúncio (avalie a qualidade do copy de verdade, não só se está preenchido) ==",
    `Mídia: ${mediaCount > 0 ? "com imagem/vídeo" : "sem mídia"}`,
    titles.length
      ? titles.map((t, i) => `Título ${i + 1}: "${t}"`).join("\n")
      : "(nenhum título preenchido)",
    bodies.length
      ? bodies.map((b, i) => `Texto ${i + 1}: "${b}"`).join("\n")
      : "(nenhum texto preenchido)",
    ad.callToAction ? `Call to action: ${ad.callToAction}` : "Call to action: não definido",
    ad.linkUrl ? `Link de destino: ${ad.linkUrl}` : "Link de destino: não definido",
    "",
    "IMPORTANTE: cheque se o texto do anúncio (título/corpo) faz sentido para ESSE público-alvo",
    "específico (idade + gênero + interesses acima) — um copy genérico ou que fala com o público",
    "errado (ex.: linguagem/tom que não combina com a faixa etária ou gênero configurados) é um",
    "problema real, mesmo que o texto em si esteja bem escrito.",
    "",
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
