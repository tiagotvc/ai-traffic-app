"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Database,
  History,
  Lightbulb,
  LoaderCircle,
  Sparkles,
  Zap
} from "lucide-react";
import { useState } from "react";

import { DsModal } from "@/design-system";
import type { CommanderMemoryCampaign } from "@/hooks/useCommanderMemory";
import { actionLabel, conditionText } from "@/lib/automation/rule-templates";
import type {
  CommanderActionChip,
  CommanderInsight,
  CommanderPipelineStep,
  CommanderRuleProposal,
  CommanderState
} from "@/lib/commander/types";

function formatCurrencyBRL(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

export function CommanderConfidenceBadge({ value }: { value: number | null }) {
  return (
    <span className="flex shrink-0 flex-col items-end">
      <span className="font-heading text-lg font-bold leading-none text-[var(--ui-accent)]">
        {value == null ? "—" : `${value}%`}
      </span>
      <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--text-dimmer)]">
        confiança
      </span>
    </span>
  );
}

export function CommanderPipeline({
  steps,
  compact = false
}: {
  steps: CommanderPipelineStep[];
  compact?: boolean;
}) {
  const visible = compact ? steps.slice(0, 4) : steps;

  return (
    <div>
      {visible.map((step, index) => {
        const Icon = step.status === "done" ? Check : step.status === "running" ? LoaderCircle : Circle;
        const isLast = index === visible.length - 1;

        return (
          <div key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px ${
                  step.status === "done"
                    ? "bg-[color-mix(in_srgb,var(--success)_35%,var(--border-color))]"
                    : "bg-[var(--border-color)]"
                }`}
              />
            ) : null}
            <span
              className={`relative z-[1] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                step.status === "done"
                  ? "border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[color-mix(in_srgb,var(--success)_14%,var(--surface-card))] text-[var(--success)]"
                  : step.status === "running"
                    ? "border-amber-500/35 bg-amber-500/10 text-[var(--amber-bright)] shadow-[0_0_16px_color-mix(in_srgb,var(--amber-bright)_18%,transparent)]"
                    : "border-[var(--border-color)] bg-[var(--surface-card)] text-[var(--text-dimmer)]"
              }`}
            >
              <Icon
                size={13}
                strokeWidth={step.status === "done" ? 2.5 : 2}
                className={step.status === "running" ? "animate-spin" : ""}
                aria-hidden
              />
            </span>
            <span className="min-w-0 pt-0.5">
              <span
                className={`block text-xs font-semibold ${
                  step.status === "pending" ? "text-[var(--text-dim)]" : "text-[var(--text-main)]"
                }`}
              >
                {step.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-snug text-[var(--text-dim)]">
                {step.description}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CommanderInsightsList({ insights }: { insights: CommanderInsight[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-color)] px-3">
      {insights.map((insight) => (
        <CommanderInsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}

export function CommanderInsightsSummary({ insights }: { insights: CommanderInsight[] }) {
  const [open, setOpen] = useState(false);
  const highCount = insights.filter((insight) => insight.impact === "high").length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-3 text-left transition-all hover:-translate-y-px hover:border-[var(--ui-accent-border)] hover:shadow-sm"
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-[var(--ui-accent)] to-[var(--amber-bright)] opacity-70"
        />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
          <Lightbulb size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-main)]">Insights do Commander</span>
            <span className="rounded-full bg-[var(--ui-accent-muted)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ui-accent)]">
              {insights.length}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-dim)]">
            {highCount > 0 ? (
              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 font-semibold text-[var(--amber)]">
                {highCount} alta prioridade
              </span>
            ) : null}
            <span>Recomendações com evidências</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
          Ver
          <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>

      <DsModal
        open={open}
        onClose={() => setOpen(false)}
        title="Insights do Commander"
        subtitle={`${insights.length} ${insights.length === 1 ? "recomendação encontrada" : "recomendações encontradas"}`}
        titleIcon={<Lightbulb size={15} />}
        width="md"
      >
        <CommanderInsightsList insights={insights} />
      </DsModal>
    </>
  );
}

function CommanderInsightCard({ insight }: { insight: CommanderInsight }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className="border-b border-[var(--border-color)] py-2.5 last:border-b-0"
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            insight.type === "warning" ? "text-[var(--amber-bright)]" : "text-[var(--ui-accent)]"
          } ${insight.type === "warning" ? "bg-amber-500/10" : "bg-[var(--ui-accent-muted)]"}`}
        >
          {insight.type === "warning" ? <AlertTriangle size={12} /> : <Lightbulb size={12} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--text-main)]">
            {insight.title}
          </p>
        </div>
        <span
          className={`self-start rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
            insight.impact === "medium"
              ? "bg-amber-500/10 text-[var(--amber)]"
              : "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
          }`}
        >
          {insight.impact === "high" ? "Alto" : insight.impact === "medium" ? "Médio" : "Baixo"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen((open) => !open)}
        className="ml-8 mt-1 flex items-center gap-1 text-[9px] font-semibold text-[var(--text-dim)] hover:text-[var(--ui-accent)]"
        aria-expanded={detailsOpen}
      >
        Detalhes
        <ChevronDown size={12} className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
      </button>

      {detailsOpen ? (
        <div className="ml-8 mt-2 space-y-2 border-t border-[var(--border-color)] pt-2 text-[10px] text-[var(--text-dim)]">
          <p className="leading-relaxed text-[var(--text-main)]">{insight.description}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <Database size={11} className="text-[var(--amber-bright)]" />
              Base analisada
            </span>
            <span className="text-right font-medium text-[var(--text-main)]">
              {insight.sources?.length ? insight.sources.join(", ") : "Rascunho atual"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Regra responsável</span>
            <span className="text-right font-medium text-[var(--text-main)]">{insight.source}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Confiança da regra</span>
            <span className="font-semibold text-[var(--amber)]">
              {insight.confidence == null ? "Não calculada" : `${insight.confidence}%`}
            </span>
          </div>
          {insight.evidence ? (
            <p className="rounded-lg bg-amber-500/[0.07] px-2 py-1.5 leading-relaxed text-[var(--text-dim)]">
              Evidências registradas: {Object.keys(insight.evidence).join(", ")}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CommanderMemorySummary({
  campaigns,
  loading
}: {
  campaigns: CommanderMemoryCampaign[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-3 text-left transition-all hover:-translate-y-px hover:border-[var(--ui-accent-border)] hover:shadow-sm"
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-[var(--ui-accent)] to-[var(--amber-bright)] opacity-70"
        />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
          <History size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-main)]">Memória do Brain</span>
          </span>
          <span className="mt-1 block text-[10px] text-[var(--text-dim)]">
            {loading
              ? "Consultando histórico…"
              : campaigns.length
                ? `${campaigns.length} campanha(s) nos últimos 7 dias`
                : "Sem métricas sincronizadas no período"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
          Ver
          <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>

      <DsModal
        open={open}
        onClose={() => setOpen(false)}
        title="Memória do Brain"
        subtitle="Campanhas reais dos últimos 7 dias"
        titleIcon={<History size={15} />}
        width="md"
      >
        {campaigns.length ? (
          <div className="overflow-hidden rounded-xl border border-[var(--border-color)] px-3">
            {campaigns.map((campaign) => (
              <div key={campaign.campaignName} className="border-b border-[var(--border-color)] py-2.5 last:border-b-0">
                <p className="text-[11px] font-semibold leading-snug text-[var(--text-main)]">
                  {campaign.campaignName}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--text-dim)]">
                  <span>Gasto: {formatCurrencyBRL(campaign.spend)}</span>
                  <span>{campaign.conversions} conv.</span>
                  <span>CTR {campaign.ctr.toFixed(2)}%</span>
                  <span>CPA {campaign.cpa != null ? formatCurrencyBRL(campaign.cpa) : "—"}</span>
                  <span>ROAS {campaign.roas.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-1 py-2 text-[11px] leading-relaxed text-[var(--text-dim)]">
            Sem métricas sincronizadas no período.
          </p>
        )}
      </DsModal>
    </>
  );
}

/**
 * Card da proposta de regra vinda do chat (aresta Commander→Engine): mostra o SE/ENTÃO,
 * a simulação de 30 dias anexada e o botão que efetiva o `POST /api/automation/rules`.
 * A regra nasce em modo de aprovação — o Commander propõe, o usuário decide.
 */
export function CommanderRuleProposalCard({
  proposal,
  onCreate,
  creating,
  created,
  error
}: {
  proposal: CommanderRuleProposal;
  onCreate: () => void;
  creating: boolean;
  created: boolean;
  error: string | null;
}) {
  const sim = proposal.simulation;
  const simText = !sim
    ? null
    : !sim.supported
      ? "Simulação indisponível para esta regra."
      : sim.campaignsTriggered === 0
        ? `Nos últimos ${sim.days} dias, nenhuma campanha teria disparado esta regra.`
        : [
            `Nos últimos ${sim.days} dias teria disparado em ${sim.campaignsTriggered} campanha(s)`,
            sim.avoidedSpend > 0 ? `evitando ${formatCurrencyBRL(sim.avoidedSpend)} de gasto` : null,
            sim.dailyBudgetIncrease > 0
              ? `+${formatCurrencyBRL(sim.dailyBudgetIncrease)}/dia de orçamento`
              : null
          ]
            .filter(Boolean)
            .join(", ") + ".";

  return (
    <div className="mt-2.5 rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ui-accent)]">
        <Zap size={12} />
        Proposta de regra
      </div>
      <p className="mt-1.5 font-heading text-xs font-semibold text-[var(--text-main)]">{proposal.name}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dim)]">
        SE {conditionText(proposal.condition)} → {actionLabel(proposal.action.type)}
      </p>
      {simText ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-dimmer)]">
          <History size={11} className="mr-1 inline-block" />
          {simText}
        </p>
      ) : null}
      {error ? <p className="mt-1.5 text-[11px] text-red-400">{error}</p> : null}
      <div className="mt-2.5 flex items-center gap-2">
        {created ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <Check size={13} strokeWidth={2.5} />
            Regra criada — aguardando na fila de aprovação em Automações.
          </span>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="ui-btn-accent inline-flex h-7 items-center justify-center gap-1.5 px-3 font-heading text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? <LoaderCircle size={12} className="animate-spin" /> : <Zap size={12} />}
            {proposal.executionMode === "auto" ? "Criar regra" : "Criar regra (com aprovação)"}
          </button>
        )}
      </div>
    </div>
  );
}

const CHIP_ACTION_LABEL: Record<CommanderActionChip["actionType"], string> = {
  pause_campaign: "Pausar agora",
  reactivate_campaign: "Reativar agora",
  adjust_budget_percent: "Ajustar orçamento"
};

/**
 * Chip de ação pontual do Commander (aresta Commander→Engine, `source: "chat"`) — diferente
 * da proposta de regra: é uma ação de agora sobre UMA campanha real desta conversa, um
 * clique chama o mesmo executor que Automações usa, sem virar automação recorrente.
 */
export function CommanderActionChipCard({
  chip,
  onApply,
  applying,
  applied,
  error
}: {
  chip: CommanderActionChip;
  onApply: () => void;
  applying: boolean;
  applied: boolean;
  error: string | null;
}) {
  return (
    <div className="mt-2.5 rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ui-accent)]">
        <Zap size={12} />
        Ação sugerida
      </div>
      <p className="mt-1.5 font-heading text-xs font-semibold text-[var(--text-main)]">{chip.title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dim)]">{chip.evidence}</p>
      {error ? <p className="mt-1.5 text-[11px] text-red-400">{error}</p> : null}
      <div className="mt-2.5 flex items-center gap-2">
        {applied ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <Check size={13} strokeWidth={2.5} />
            Aplicado — registrado em Automações › Execuções.
          </span>
        ) : (
          <button
            type="button"
            onClick={onApply}
            disabled={applying}
            className="ui-btn-accent inline-flex h-7 items-center justify-center gap-1.5 px-3 font-heading text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? <LoaderCircle size={12} className="animate-spin" /> : <Zap size={12} />}
            {CHIP_ACTION_LABEL[chip.actionType]}
          </button>
        )}
      </div>
    </div>
  );
}
