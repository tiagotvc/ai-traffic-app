"use client";

import { Check, Minus } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import { BillingCtaLink, type PlanCardData } from "@/components/billing/PlanLimitsCard";
import { BillingCycleToggle } from "@/components/billing/BillingCycleToggle";
import { resolveBillingCurrency, planListCents, resolvePlanMonthlyCents } from "@/lib/billing/currency";
import { calculateCheckoutPricing, formatMoney } from "@/lib/billing/pricing";
import { mergePlanWithOfficialPricing } from "@/lib/marketing/orion-plan-catalog";
import {
  COMPARISON_PLAN_SLUG_ORDER,
  MARKETING_FEATURE_ROWS,
  PLUS_SLUGS,
  type MarketingFeatureValue
} from "@/lib/billing/plan-comparison";

function renderFeatureCell(value: MarketingFeatureValue | undefined) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={14} className="mx-auto text-emerald-400" aria-label="Incluído" />
    ) : (
      <Minus size={14} className="mx-auto text-white/20" aria-label="Não incluído" />
    );
  }
  return <span>{value ?? "—"}</span>;
}

/**
 * Comparativo completo dos 6 planos pagos (mesma tabela que existia só no checkout) — agora
 * também na landing, pra quem ainda não criou conta poder comparar recursos antes de assinar.
 */
export function PlanComparisonTable() {
  const locale = useLocale();
  const currency = resolveBillingCurrency(locale);
  const [plans, setPlans] = useState<PlanCardData[]>([]);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((j) => {
        const rows = (j.plans ?? []) as PlanCardData[];
        setPlans(rows.map((p) => mergePlanWithOfficialPricing(p) as PlanCardData));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !plans.length) return null;

  const orderedPlans = COMPARISON_PLAN_SLUG_ORDER.map((slug) =>
    plans.find((p) => p.slug === slug)
  ).filter((p): p is PlanCardData => Boolean(p));
  if (!orderedPlans.length) return null;

  const priceFor = (p: PlanCardData) =>
    calculateCheckoutPricing({
      priceMonthlyCents: resolvePlanMonthlyCents(p, currency),
      listCents: planListCents(p, cycle, currency),
      cycle,
      provider: currency === "BRL" ? "asaas" : "stripe"
    }).finalCents;

  return (
    <div className="space-y-6">
      <BillingCycleToggle cycle={cycle} onChange={setCycle} variant="marketing" />

      <div className="overflow-x-auto rounded-xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg)]">
        <table className="w-full min-w-[880px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)]">
              <th className="sticky left-0 z-10 bg-[var(--creator-card-bg-inset)] px-3 py-3 text-left font-semibold text-[var(--text-dim)]">
                Recursos
              </th>
              {orderedPlans.map((p) => (
                <th key={p.id} className="px-3 py-3 text-center align-top">
                  {PLUS_SLUGS.has(p.slug) ? (
                    <span className="mb-1 inline-block rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-black">
                      PLUS
                    </span>
                  ) : null}
                  <div className="font-semibold text-[var(--text-main)]">{p.name}</div>
                  <div className="mt-0.5 text-sm font-black text-[var(--text-main)]">
                    {formatMoney(priceFor(p), currency)}
                    <span className="text-[10px] font-medium text-[var(--text-dimmer)]">
                      /{cycle === "yearly" ? "ano" : "mês"}
                    </span>
                  </div>
                  <BillingCtaLink
                    planId={p.id}
                    slug={p.slug}
                    variant="marketing"
                    className="ui-btn-accent-outline mt-2 block w-full py-1.5 text-center text-[11px] font-semibold"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MARKETING_FEATURE_ROWS.map((row, i) => (
              <tr key={row.key} className={i % 2 === 0 ? "bg-[var(--surface-row-alt)]" : undefined}>
                <td className="sticky left-0 z-10 bg-[var(--creator-card-bg)] px-3 py-2 text-[var(--text-dim)]">{row.label}</td>
                {orderedPlans.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-center text-[var(--text-main)]">
                    {renderFeatureCell(row.values[p.slug])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
