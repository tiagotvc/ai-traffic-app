"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Sparkles, Wallet, X } from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";

/**
 * Centro de Recomendações do Orion Cortex: "onde estou perdendo dinheiro?" respondido
 * com propostas concretas (regras sugeridas pelo Brain, com simulação anexada).
 * Aprovar cria a automação em modo aprovação — o usuário nem precisa saber que existe
 * uma "regra" por trás.
 */

type Recommendation = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  simulation: {
    days?: number;
    campaignsTriggered?: number;
    avoidedSpend?: number;
    dailyBudgetIncrease?: number;
  } | null;
  createdAt: string;
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export function CortexRecommendationsView() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [potentialSavings, setPotentialSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/cortex/recommendations")
      .then((r) => r.json())
      .then((j: { ok?: boolean; items?: Recommendation[]; totals?: { potentialSavings?: number } }) => {
        setItems(j.items ?? []);
        setPotentialSavings(j.totals?.potentialSavings ?? 0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (rec: Recommendation, action: "execute" | "reject") => {
    setResolvingId(rec.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(rec.clientId)}/action-suggestions/${encodeURIComponent(rec.id)}/${action}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }
      );
      if (!res.ok) throw new Error();
      load();
    } catch {
      setError("Não foi possível processar agora. Tente de novo.");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          icon={<Sparkles size={16} />}
          title="Recomendações"
          subtitle="O Cortex analisou suas contas e encontrou onde agir. Aprovar cria a automação — nada roda sem o seu OK."
          showGlobalFilters={false}
          showSync={false}
        />

        <div className="campaign-creator-card flex flex-wrap items-center gap-4 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Wallet size={17} />
          </span>
          <div>
            <p className="font-heading text-xl font-bold text-emerald-400">
              {loading ? "…" : brl(potentialSavings)}
            </p>
            <p className="font-body text-[11px] text-[var(--text-dimmer)]">
              economia potencial estimada pelas simulações de 30 dias
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="campaign-creator-card p-8 text-center font-body text-xs text-[var(--text-dim)]">
            Carregando recomendações…
          </div>
        ) : items.length === 0 ? (
          <div className="campaign-creator-card p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--creator-card-bg-inset)] text-[var(--text-dimmer)]">
              <Sparkles size={24} />
            </span>
            <div className="mt-3 font-heading text-sm font-semibold text-[var(--text-main)]">
              Nenhuma recomendação aberta
            </div>
            <p className="mt-1 font-body text-xs text-[var(--text-dim)]">
              O Cortex gera recomendações a cada sincronização, cruzando as metas dos clientes com os
              dados reais. Configure metas (CPA alvo, ROAS mínimo) para recomendações melhores.
            </p>
          </div>
        ) : (
          <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
            {items.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-wrap items-start gap-3 border-b border-[var(--creator-card-border)] p-4 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                      {rec.title.replace(/^Regra sugerida: /, "")}
                    </span>
                    {rec.priority === "HIGH" ? (
                      <span className="ds-table-compact-badge ds-table-compact-badge--accent">
                        Alta prioridade
                      </span>
                    ) : null}
                    <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">
                      {rec.clientName}
                    </span>
                  </div>
                  <p className="mt-1 font-body text-[11px] leading-relaxed text-[var(--text-dim)]">
                    {rec.description}
                  </p>
                  {rec.simulation?.avoidedSpend ? (
                    <p className="mt-1 font-body text-[11px] font-semibold text-emerald-400">
                      💰 Impacto estimado: {brl(rec.simulation.avoidedSpend)} em{" "}
                      {rec.simulation.days ?? 30} dias
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void resolve(rec, "execute")}
                  disabled={resolvingId === rec.id}
                  className="ui-btn-accent inline-flex h-8 items-center justify-center gap-1.5 px-3 font-heading text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check size={14} strokeWidth={2.5} />
                  Aprovar automação
                </button>
                <button
                  type="button"
                  onClick={() => void resolve(rec, "reject")}
                  disabled={resolvingId === rec.id}
                  className="ds-table-compact-action ds-table-compact-action--danger p-1.5"
                  title="Dispensar"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppPageShell>
  );
}
