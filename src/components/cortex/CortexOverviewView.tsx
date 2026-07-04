"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Brain, Eye, FlaskConical, Lightbulb, Sparkles, Wallet, Zap } from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Link } from "@/i18n/navigation";

/**
 * Home do Orion Cortex — "o cérebro operacional trabalhando 24h": onde estou perdendo
 * dinheiro (recomendações + economia potencial), o que ele fez (timeline) e o freio de
 * mão (modo observação).
 */

type Overview = {
  observationMode: boolean;
  stats: {
    potentialSavings: number;
    recommendations: number;
    activeRules: number;
    executions7d: number;
    suggestedLearnings: number;
    openHypotheses: number;
  };
  timeline: Array<{ id: string; at: string; module: string; label: string }>;
};

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const MODULE_DOT: Record<string, string> = {
  engine: "bg-amber-400",
  laboratory: "bg-sky-400",
  brain: "bg-violet-400",
  commander: "bg-emerald-400"
};

export function CortexOverviewView() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/cortex/overview")
      .then((r) => r.json())
      .then((j) => setData(j.ok ? (j as Overview & { ok: boolean }) : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleObservation = async (next: boolean) => {
    setSavingMode(true);
    try {
      const res = await fetch("/api/cortex/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ observationMode: next })
      });
      if (res.ok) setData((d) => (d ? { ...d, observationMode: next } : d));
    } finally {
      setSavingMode(false);
    }
  };

  const stats = data?.stats;

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          icon={<Brain size={16} />}
          title="Orion Cortex"
          subtitle="Seu especialista de otimização trabalhando 24h: observa, aprende, recomenda e executa com segurança."
          showGlobalFilters={false}
          showSync={false}
          actions={
            <Link
              href="/cortex/recommendations"
              className="ui-btn-accent ui-btn-responsive font-heading font-bold"
            >
              <Sparkles size={15} />
              <span className="ui-btn-responsive-label">Ver recomendações</span>
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {[
            {
              icon: <Wallet size={15} />,
              value: loading ? "…" : brl(stats?.potentialSavings ?? 0),
              label: "Economia potencial",
              accent: true
            },
            {
              icon: <Sparkles size={15} />,
              value: loading ? "…" : String(stats?.recommendations ?? 0),
              label: "Recomendações abertas"
            },
            {
              icon: <Zap size={15} />,
              value: loading ? "…" : String(stats?.activeRules ?? 0),
              label: "Automações ativas"
            },
            {
              icon: <Activity size={15} />,
              value: loading ? "…" : String(stats?.executions7d ?? 0),
              label: "Execuções (7 dias)"
            },
            {
              icon: <Lightbulb size={15} />,
              value: loading ? "…" : String(stats?.suggestedLearnings ?? 0),
              label: "Aprendizados sugeridos"
            },
            {
              icon: <FlaskConical size={15} />,
              value: loading ? "…" : String(stats?.openHypotheses ?? 0),
              label: "Hipóteses abertas"
            }
          ].map((card) => (
            <div key={card.label} className="campaign-creator-card p-3.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  card.accent
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                }`}
              >
                {card.icon}
              </span>
              <p
                className={`mt-2 font-heading text-lg font-bold ${
                  card.accent ? "text-emerald-400" : "text-[var(--text-main)]"
                }`}
              >
                {card.value}
              </p>
              <p className="font-body text-[10px] text-[var(--text-dimmer)]">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="campaign-creator-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
              <Eye size={15} />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
                Modo observação
              </p>
              <p className="mt-0.5 font-body text-[11px] text-[var(--text-dim)]">
                Ligado, o Cortex apenas observa e recomenda — nenhuma automação executa ação
                destrutiva, mesmo as configuradas como automáticas. Perfeito para os primeiros dias.
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 font-body text-xs text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={data?.observationMode ?? false}
              disabled={loading || savingMode}
              onChange={(e) => void toggleObservation(e.target.checked)}
              className="accent-[var(--ui-accent)]"
            />
            {data?.observationMode ? "Observando" : "Executando"}
          </label>
        </div>

        <div>
          <h3 className="campaign-creator-orion-section-label mb-3">Linha do tempo</h3>
          {loading ? (
            <div className="campaign-creator-card p-6 text-center font-body text-xs text-[var(--text-dim)]">
              Carregando…
            </div>
          ) : !data?.timeline.length ? (
            <div className="campaign-creator-card p-6 text-center font-body text-xs text-[var(--text-dim)]">
              Sem atividade ainda — a linha do tempo aparece conforme o Cortex observa, recomenda e executa.
            </div>
          ) : (
            <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
              {data.timeline.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 border-b border-[var(--creator-card-border)] px-4 py-2.5 last:border-0"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${MODULE_DOT[e.module] ?? "bg-slate-400"}`}
                  />
                  <span className="min-w-0 flex-1 truncate font-body text-xs text-[var(--text-dim)]">
                    {e.label}
                  </span>
                  <span className="shrink-0 font-body text-[10px] text-[var(--text-dimmer)]">
                    {new Date(e.at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppPageShell>
  );
}
