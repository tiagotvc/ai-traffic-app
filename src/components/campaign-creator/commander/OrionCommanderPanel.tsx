"use client";

import { Settings, Sparkles } from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { CommanderObservingIndicator } from "@/components/commander/CommanderObservingIndicator";
import { CommanderChatThread } from "@/components/commander/CommanderChatThread";
import { Link } from "@/i18n/navigation";
import { useCommanderAccess } from "@/hooks/useCommanderAccess";
import { useCommanderMemory } from "@/hooks/useCommanderMemory";
import { adHasMedia, getActiveAd, getActiveAdset } from "@/lib/campaign-draft";

import { CommanderConfidenceBadge, CommanderInsightsSummary, CommanderMemorySummary, CommanderPipeline } from "./CommanderParts";
import { useCommanderState } from "./useCommanderState";

export function OrionCommanderPanel() {
  const { state, analyzing, researchMode, activeScientists } = useCommanderState("desktop");
  const { payload, activeNode } = useCampaignDraft();
  const { memory, structuralInsights } = useCommanderAccess();
  const { campaigns: memoryCampaigns, loading: memoryLoading } = useCommanderMemory(
    payload.clientSlug,
    memory
  );
  const adset = getActiveAdset(payload);
  const ad = getActiveAd(payload);
  const completedSteps = state.pipeline.filter((step) => step.status === "done").length;

  return (
    <section
      className="campaign-creator-sidebar-card commander-premium-shell flex min-h-0 flex-col"
      aria-label="Orion Commander"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] shadow-[0_0_22px_var(--ui-accent-glow)]">
            <Sparkles size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--ui-accent)]">
              Orion AI
            </div>
            <h3 className="mt-0.5 truncate font-heading text-base font-bold leading-tight text-[var(--text-main)]">
              Commander
            </h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CommanderConfidenceBadge value={state.confidence} />
          <Link
            href="/commander"
            aria-label="Configurar o Commander"
            title="Configurar o Commander"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--text-dimmer)] transition-colors hover:bg-[var(--surface-bg)] hover:text-[var(--text-main)]"
          >
            <Settings size={13} />
          </Link>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-dim)]">
        {analyzing
          ? "Recalculando a estratégia com suas alterações…"
          : "Comando estratégico da sua campanha, em tempo real."}
      </p>

      <div className="mt-3">
        <CommanderChatThread
          clientSlug={payload.clientSlug || undefined}
          insights={state.insights}
          draft={{
            objective: payload.objective || undefined,
            campaignName: payload.campaign.name || undefined,
            dailyBudgetBRL: payload.campaign.dailyBudgetBRL || undefined,
            adsetName: adset.name || undefined,
            hasMedia: adHasMedia(ad),
            personaSelected: Boolean(adset.personaId),
            step: activeNode ?? undefined
          }}
        />
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-dimmer)]">
            Análise em tempo real
          </h4>
          <span className="flex items-center gap-1.5 text-[9px] text-[var(--text-dimmer)]">
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 font-semibold text-[var(--amber)]">
              {researchMode === "scientists"
                ? `${activeScientists.length} Scientist${activeScientists.length === 1 ? "" : "s"}`
                : "Sem Scientists"}
            </span>
            {completedSteps}/{state.pipeline.length}
          </span>
        </div>
        <CommanderPipeline steps={state.pipeline} />
      </div>

      <CommanderObservingIndicator className="mt-3" />

      {structuralInsights && state.insights.length > 0 ? (
        <div className="mt-5">
          <CommanderInsightsSummary insights={state.insights} />
        </div>
      ) : null}

      {memory ? (
        <div className="mt-3">
          <CommanderMemorySummary campaigns={memoryCampaigns} loading={memoryLoading} />
        </div>
      ) : null}
    </section>
  );
}
