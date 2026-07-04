"use client";

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";

import { ruleFormToPayload, type RuleForm } from "@/lib/automation/rule-templates";

type SimTotals = {
  campaignsTriggered: number;
  alertDays: number;
  avoidedSpend: number;
  dailyBudgetIncrease: number;
  falsePositives: number;
  conversionsPreservedPct: number;
  confidence: number;
  confidenceReasons: string[];
  confidenceRisks: string[];
};

type SimCampaign = {
  metaCampaignId: string;
  campaignName: string | null;
  firstTriggerDay: string;
  daysTriggered: number;
  spendAfterTrigger: number;
};

type SimResult =
  | { supported: false; reason: string }
  | {
      supported: true;
      days: number;
      evaluatedCampaigns: number;
      campaigns: SimCampaign[];
      totals: SimTotals;
    };

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const shortDay = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
      new Date(`${iso}T12:00:00Z`)
    );
  } catch {
    return iso;
  }
};

/**
 * Simulação (backtest) da regra no passo de Revisão: roda a condição contra os últimos 30 dias
 * de histórico real e mostra o que ela teria feito — antes de o usuário ativar qualquer coisa.
 */
export function AutomationRuleSimulationCard({ form }: { form: RuleForm }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSchedule = form.kind === "schedule";

  const simulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = ruleFormToPayload(form);
      const res = await fetch("/api/automation/rules/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          condition: payload.condition,
          action: payload.action,
          clientId: payload.clientId,
          level: "level" in payload ? payload.level : "campaign",
          days: 30
        })
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { result?: SimResult };
      setResult(data.result ?? null);
    } catch {
      setError("Não foi possível simular a regra agora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campaign-creator-card campaign-creator-card--compact space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
          <FlaskConical size={14} />
        </span>
        <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
          Simulação Orion — últimos 30 dias
        </span>
      </div>

      {isSchedule ? (
        <p className="font-body text-[11px] text-[var(--text-dimmer)]">
          A simulação usa métricas diárias e ainda não cobre regras de horário.
        </p>
      ) : (
        <>
          <p className="font-body text-[11px] text-[var(--text-dimmer)]">
            Veja o que essa regra teria feito com os dados reais das suas campanhas — sem executar nada.
          </p>

          {result === null ? (
            <button
              type="button"
              onClick={simulate}
              disabled={loading}
              className="ui-btn-secondary inline-flex h-8 items-center justify-center gap-1.5 px-3 font-heading text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
              {loading ? "Simulando…" : "Rodar simulação"}
            </button>
          ) : null}

          {error ? <p className="font-body text-[11px] text-red-400">{error}</p> : null}

          {result?.supported ? (
            <div className="space-y-2">
              {result.totals.campaignsTriggered === 0 ? (
                <p className="font-body text-xs text-[var(--text-dim)]">
                  Nenhuma das {result.evaluatedCampaigns} campanhas analisadas teria disparado essa regra
                  nos últimos {result.days} dias.
                </p>
              ) : (
                <>
                  <div className="rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] p-3">
                    <p className="font-body text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">
                      Se esta regra estivesse ativa nos últimos {result.days} dias:
                    </p>
                    <ul className="mt-2 space-y-1.5 font-body text-xs text-[var(--text-main)]">
                      <li>
                        🛑 Teria disparado em{" "}
                        <strong>{result.totals.campaignsTriggered}</strong> de{" "}
                        {result.evaluatedCampaigns} alvo
                        {result.evaluatedCampaigns === 1 ? "" : "s"}
                      </li>
                      {form.action === "pause_campaign" ? (
                        <li>
                          💰 Economia estimada:{" "}
                          <strong className="text-emerald-400">
                            {brl(result.totals.avoidedSpend)}
                          </strong>
                        </li>
                      ) : null}
                      {form.action === "adjust_budget_percent" ? (
                        <li>
                          {result.totals.dailyBudgetIncrease >= 0 ? "📈" : "📉"} Orçamento:{" "}
                          <strong
                            className={
                              result.totals.dailyBudgetIncrease >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }
                          >
                            {result.totals.dailyBudgetIncrease >= 0 ? "+" : "−"}
                            {brl(Math.abs(result.totals.dailyBudgetIncrease))}/dia
                          </strong>
                        </li>
                      ) : null}
                      {form.action === "pause_campaign" ? (
                        <>
                          <li>
                            📈 Conversões preservadas:{" "}
                            <strong>{result.totals.conversionsPreservedPct}%</strong>
                          </li>
                          <li>
                            ⚠️ Falsos positivos:{" "}
                            <strong
                              className={
                                result.totals.falsePositives > 0 ? "text-amber-300" : undefined
                              }
                            >
                              {result.totals.falsePositives}
                            </strong>{" "}
                            <span className="text-[var(--text-dimmer)]">
                              (alvos que voltaram a converter após o gatilho)
                            </span>
                          </li>
                        </>
                      ) : (
                        <li>
                          🔔 {result.totals.alertDays} dia
                          {result.totals.alertDays === 1 ? "" : "s"}-disparo no período
                        </li>
                      )}
                    </ul>
                    <div className="mt-3 border-t border-[var(--creator-card-border)] pt-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">
                          🧠 Confiança Orion
                        </span>
                        <span
                          className={`font-heading text-lg font-bold ${
                            result.totals.confidence >= 75
                              ? "text-emerald-400"
                              : result.totals.confidence >= 55
                                ? "text-amber-300"
                                : "text-rose-400"
                          }`}
                        >
                          {result.totals.confidence}%
                        </span>
                      </div>
                      {result.totals.confidenceReasons.map((r) => (
                        <p key={r} className="font-body text-[10px] text-[var(--text-dim)]">
                          ✔ {r}
                        </p>
                      ))}
                      {result.totals.confidenceRisks.map((r) => (
                        <p key={r} className="font-body text-[10px] text-amber-300">
                          ⚠ {r}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Safety: aviso de agressividade — regra destrutiva pegando metade+ da conta. */}
                  {(form.action === "pause_campaign" ||
                    (form.action === "adjust_budget_percent" && (form.budgetPercent ?? 10) < 0)) &&
                  result.evaluatedCampaigns >= 3 &&
                  result.totals.campaignsTriggered / result.evaluatedCampaigns >= 0.5 ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 font-body text-[11px] leading-relaxed text-amber-300">
                      ⚠ Regra agressiva: dispararia em {result.totals.campaignsTriggered} de{" "}
                      {result.evaluatedCampaigns} campanhas (
                      {Math.round(
                        (result.totals.campaignsTriggered / result.evaluatedCampaigns) * 100
                      )}
                      %). Considere subir os limites, exigir mais dias seguidos ou usar o modo
                      de aprovação.
                    </div>
                  ) : null}

                  <ul className="space-y-1">
                    {result.campaigns.slice(0, 4).map((c) => (
                      <li
                        key={c.metaCampaignId}
                        className="flex items-baseline justify-between gap-2 font-body text-[11px]"
                      >
                        <span className="min-w-0 truncate text-[var(--text-dim)]">
                          {c.campaignName ?? c.metaCampaignId}
                        </span>
                        <span className="shrink-0 text-[var(--text-dimmer)]">
                          desde {shortDay(c.firstTriggerDay)}
                        </span>
                      </li>
                    ))}
                    {result.campaigns.length > 4 ? (
                      <li className="font-body text-[10px] text-[var(--text-dimmer)]">
                        + {result.campaigns.length - 4} outras
                      </li>
                    ) : null}
                  </ul>
                </>
              )}
              <button
                type="button"
                onClick={simulate}
                disabled={loading}
                className="font-heading text-[11px] font-semibold text-[var(--ui-accent)] hover:underline disabled:opacity-50"
              >
                {loading ? "Simulando…" : "Simular novamente"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
