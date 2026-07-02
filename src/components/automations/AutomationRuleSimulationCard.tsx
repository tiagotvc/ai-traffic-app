"use client";

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";

import { ruleFormToPayload, type RuleForm } from "@/lib/automation/rule-templates";

type SimTotals = {
  campaignsTriggered: number;
  alertDays: number;
  avoidedSpend: number;
  dailyBudgetIncrease: number;
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
          Simular últimos 30 dias
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2.5 py-2">
                      <p className="font-heading text-base font-bold text-[var(--text-main)]">
                        {result.totals.campaignsTriggered}
                      </p>
                      <p className="font-body text-[10px] text-[var(--text-dimmer)]">
                        campanha{result.totals.campaignsTriggered > 1 ? "s" : ""} teria
                        {result.totals.campaignsTriggered > 1 ? "m" : ""} disparado
                      </p>
                    </div>
                    {form.action === "pause_campaign" ? (
                      <div className="rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2.5 py-2">
                        <p className="font-heading text-base font-bold text-emerald-400">
                          {brl(result.totals.avoidedSpend)}
                        </p>
                        <p className="font-body text-[10px] text-[var(--text-dimmer)]">gasto evitado</p>
                      </div>
                    ) : form.action === "adjust_budget_percent" ? (
                      <div className="rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2.5 py-2">
                        <p className="font-heading text-base font-bold text-emerald-400">
                          +{brl(result.totals.dailyBudgetIncrease)}
                        </p>
                        <p className="font-body text-[10px] text-[var(--text-dimmer)]">orçamento/dia</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2.5 py-2">
                        <p className="font-heading text-base font-bold text-[var(--text-main)]">
                          {result.totals.alertDays}
                        </p>
                        <p className="font-body text-[10px] text-[var(--text-dimmer)]">
                          alerta{result.totals.alertDays > 1 ? "s" : ""} gerado
                          {result.totals.alertDays > 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </div>

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
