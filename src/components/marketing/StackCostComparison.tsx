"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { BillingCycleToggle } from "@/components/billing/BillingCycleToggle";
import { MarketingPlanStackPicker } from "@/components/marketing/MarketingPlanStackPicker";
import {
  isBrBillingMode,
  planListCents,
  resolveBillingCurrency,
  resolvePlanMonthlyCents
} from "@/lib/billing/currency";
import { calculateCheckoutPricing, formatMoney } from "@/lib/billing/pricing";
import {
  buildMarketingPlanFallback,
  MARKETING_VITRINE_SLUGS,
  mergePlanWithOfficialPricing,
  type MarketingPlanRow
} from "@/lib/marketing/orion-plan-catalog";
import {
  formatBenchmarkPrice,
  getStackToolsForPlan,
  getOrionIncludesKey,
  sumStackMonthlyCents
} from "@/lib/marketing/stack-benchmarks";
import { cn } from "@/lib/cn";

export function StackCostComparison({ className }: { className?: string }) {
  const t = useTranslations("marketing");
  const locale = useLocale();
  const isBr = isBrBillingMode(locale);
  const currency = resolveBillingCurrency(locale);

  const [plans, setPlans] = useState<MarketingPlanRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("advanced");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((j) => {
        const apiPlans = ((j.plans ?? []) as MarketingPlanRow[]).filter((p) =>
          MARKETING_VITRINE_SLUGS.includes(p.slug as (typeof MARKETING_VITRINE_SLUGS)[number])
        );

        const merged = MARKETING_VITRINE_SLUGS.map((slug) => {
          const fromApi = apiPlans.find((p) => p.slug === slug);
          if (fromApi) return mergePlanWithOfficialPricing(fromApi);
          return buildMarketingPlanFallback(slug);
        });

        setPlans(merged);
      })
      .catch(() => {
        setPlans(MARKETING_VITRINE_SLUGS.map((slug) => buildMarketingPlanFallback(slug)));
      });
  }, []);

  const selectedPlan = plans.find((p) => p.slug === selectedSlug) ?? plans[0];

  const stackTools = useMemo(
    () => (selectedSlug ? getStackToolsForPlan(selectedSlug) : []),
    [selectedSlug]
  );

  const orionIncludesKey = useMemo(
    () => getOrionIncludesKey(selectedSlug),
    [selectedSlug]
  );

  const stackMonthlyCents = useMemo(
    () => sumStackMonthlyCents(stackTools, isBr),
    [stackTools, isBr]
  );

  const orionPricing = useMemo(() => {
    if (!selectedPlan) return null;
    const monthlyCents = resolvePlanMonthlyCents(selectedPlan, currency);
    return calculateCheckoutPricing({
      priceMonthlyCents: monthlyCents,
      listCents: planListCents(selectedPlan, cycle, currency),
      cycle,
      provider: "asaas",
      billingType: "CREDIT_CARD"
    });
  }, [selectedPlan, cycle, currency]);

  const orionDisplayCents = useMemo(() => {
    if (!orionPricing) return 0;
    if (cycle === "yearly") return Math.round(orionPricing.finalCents / 12);
    return orionPricing.finalCents;
  }, [orionPricing, cycle]);

  const savingsMonthlyCents = Math.max(0, stackMonthlyCents - orionDisplayCents);
  const savingsYearlyCents = Math.max(0, stackMonthlyCents * 12 - (orionPricing?.finalCents ?? 0));
  const savingsPercent =
    stackMonthlyCents > 0 ? Math.round((savingsMonthlyCents / stackMonthlyCents) * 100) : 0;

  const trendData = useMemo(() => {
    if (!orionPricing) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const stackAcc = (stackMonthlyCents / 100) * month;
      const orionAcc = (orionDisplayCents / 100) * month;
      return { month: `${month}`, stack: stackAcc, orion: orionAcc };
    });
  }, [stackMonthlyCents, orionDisplayCents, orionPricing]);

  return (
    <section className={cn("relative", className)}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex w-full flex-col items-center gap-5">
          <BillingCycleToggle cycle={cycle} onChange={setCycle} variant="marketing" />
          <MarketingPlanStackPicker
            plans={
              plans.length
                ? plans
                : MARKETING_VITRINE_SLUGS.map((s) => buildMarketingPlanFallback(s))
            }
            cycle={cycle}
            selectedSlug={selectedSlug}
            onSelect={setSelectedSlug}
            locale={locale}
          />
          <p className="text-center text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-dimmer)]">
            {t("stackPickerHint")}
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          {/* LEFT — the functions you'd pay for separately (quiet) */}
          <div>
            <div className="flex items-baseline justify-between border-b border-[var(--border-color)] pb-3">
              <span className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-dimmer)]">
                {t("stackColTool")}
              </span>
              <span className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-dimmer)]">
                {t("stackColPrice")}
              </span>
            </div>

            <ul>
              {stackTools.map((tool) => (
                <li
                  key={tool.id}
                  className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] py-4 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="text-sm text-[var(--text-main)]">{t(tool.labelKey)}</span>
                    <p className="mt-1 text-[11px] leading-snug text-[var(--text-dim)]">
                      <span className="font-medium text-[var(--ui-accent)]">{t("stackMapsToLabel")}</span>{" "}
                      {t(tool.mapsToKey)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-[var(--text-dim)] line-through decoration-[var(--text-dimmer)]">
                    {formatBenchmarkPrice(isBr ? tool.monthlyBrlCents : tool.monthlyUsdCents, isBr)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-1 flex items-baseline justify-between border-t-2 border-[var(--border-color)] pt-4">
              <span className="text-sm font-semibold text-[var(--text-dim)]">{t("stackTotalLabel")}</span>
              <span className="font-heading text-xl font-bold text-red-300/90">
                {formatBenchmarkPrice(stackMonthlyCents, isBr)}
                <span className="ml-0.5 text-xs font-normal text-[var(--text-dimmer)]">{t("orionPerMonth")}</span>
              </span>
            </div>

            <p className="mt-6 text-[10px] leading-relaxed text-[var(--text-dimmer)]">{t("stackSourcesNote")}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-dimmer)]">{t("stackDisclaimer")}</p>
          </div>

          {/* RIGHT — the Orion outcome (the one bold moment) */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] p-5">
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--ui-accent)]">
                {t("orionLabel")}
              </p>
              <h3 className="mt-2 font-heading text-xl font-bold text-[var(--text-main)]">
                {selectedPlan?.name ?? t("orionPlanName")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">{t(orionIncludesKey)}</p>

              <div className="mt-6 flex flex-wrap items-baseline gap-2">
                {orionPricing && orionPricing.discountPercent > 0 && cycle === "yearly" ? (
                  <span className="text-sm text-[var(--text-dimmer)] line-through">
                    {formatMoney(orionPricing.listCents, currency)}
                  </span>
                ) : null}
                <span className="font-heading text-[2.2rem] font-bold leading-none text-[var(--ui-accent)]">
                  {orionPricing ? formatMoney(orionPricing.finalCents, currency) : "—"}
                </span>
                <span className="text-sm text-[var(--text-dim)]">
                  {cycle === "yearly" ? t("orionPerYear") : t("orionPerMonth")}
                </span>
              </div>
              {cycle === "yearly" && orionPricing ? (
                <p className="mt-1 text-xs text-[var(--text-dimmer)]">
                  {t("orionEffectiveMonthly", {
                    value: formatMoney(Math.round(orionPricing.finalCents / 12), currency)
                  })}
                </p>
              ) : null}

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--ui-accent-border)] pt-5">
                <div className="min-w-0">
                  <p className="text-[0.6rem] uppercase tracking-[0.14em] text-emerald-200/80">
                    {cycle === "yearly" ? t("yearlySavingsTitle") : t("monthlySavingsTitle")}
                  </p>
                  <p className="mt-0.5 font-heading text-xl font-bold text-emerald-300">
                    {formatBenchmarkPrice(cycle === "yearly" ? savingsYearlyCents : savingsMonthlyCents, isBr)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                  -{savingsPercent}%
                </span>
              </div>
            </div>

            <div className="border-l-2 border-[var(--ui-accent-border)] pl-4">
              <p className="text-xs font-semibold text-[var(--text-main)]">{t("stackOrionExtraTitle")}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">{t("stackOrionExtraBody")}</p>
            </div>

            <div>
              <p className="mb-3 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-dimmer)]">
                {t("chartTrendTitle")}
              </p>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "var(--text-dimmer)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface-card)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 12,
                        fontSize: 11,
                        color: "var(--text-main)"
                      }}
                      formatter={(value, name) => {
                        const n = Number(value);
                        const formatted = isBr
                          ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : `$${n.toFixed(0)}`;
                        return [
                          formatted,
                          name === "stack" ? t("chartStackLabel") : selectedPlan?.name ?? "Orion"
                        ];
                      }}
                    />
                    <Bar dataKey="stack" fill="rgba(248,113,113,0.55)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="orion" fill="var(--ui-accent)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[10px] text-[var(--text-dimmer)]">{t("chartTrendHint")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
