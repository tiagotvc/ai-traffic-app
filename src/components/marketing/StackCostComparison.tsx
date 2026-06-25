"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
    () => (selectedSlug ? getStackToolsForPlan(selectedSlug, isBr) : []),
    [selectedSlug, isBr]
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

  const chartData = useMemo(() => {
    if (!selectedPlan || !orionPricing) return [];
    const stackLabel = t("chartStackLabel");
    const orionLabel = selectedPlan.name;
    const stackValue = cycle === "yearly" ? stackMonthlyCents * 12 : stackMonthlyCents;
    const orionValue = cycle === "yearly" ? orionPricing.finalCents : orionDisplayCents;

    return [
      { name: stackLabel, value: stackValue / 100, fill: "rgba(248,113,113,0.75)" },
      { name: orionLabel, value: orionValue / 100, fill: "#f5a623" }
    ];
  }, [selectedPlan, orionPricing, cycle, stackMonthlyCents, orionDisplayCents, t]);

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
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400/90">
            {t("stackBadge")}
          </p>
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("stackTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-violet-200/70">
            {t("stackSubtitle")}
          </p>
        </div>

        <div className="mb-6 flex w-full flex-col items-center gap-10">
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
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-violet-300/70 sm:px-5">
                <span>{t("stackColTool")}</span>
                <span>{t("stackColPrice")}</span>
              </div>
              <ul>
                {stackTools.map((tool) => (
                  <li
                    key={tool.id}
                    className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-white/5 px-4 py-3.5 last:border-0 sm:px-5"
                  >
                    <div>
                      <span className="text-sm text-violet-100/90">{t(tool.labelKey)}</span>
                      <a
                        href={tool.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-[10px] text-violet-400/50 hover:text-amber-300/80"
                      >
                        {t(tool.sourceKey)}
                      </a>
                    </div>
                    <span className="text-sm font-semibold text-violet-200/60 line-through decoration-violet-400/40">
                      {formatBenchmarkPrice(isBr ? tool.monthlyBrlCents : tool.monthlyUsdCents, isBr)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-white/10 bg-red-950/20 px-4 py-4 sm:px-5">
                <span className="text-sm font-semibold text-red-200/90">{t("stackTotalLabel")}</span>
                <span className="font-heading text-lg font-bold text-red-300">
                  {formatBenchmarkPrice(stackMonthlyCents, isBr)}
                  {t("orionPerMonth")}
                </span>
              </div>
            </div>

            <p className="text-center text-[10px] leading-relaxed text-violet-400/45">{t("stackSourcesNote")}</p>
          </div>

          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-violet-950/80 via-indigo-950/80 to-slate-950/90 p-6 shadow-xl shadow-violet-950/40">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/15 blur-2xl" />
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                {t("orionLabel")}
              </p>
              <h3 className="mt-2 font-heading text-xl font-bold text-white">
                {selectedPlan?.name ?? t("orionPlanName")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-violet-200/75">{t("orionIncludes")}</p>

              <div className="mt-6 flex flex-wrap items-baseline gap-2">
                {orionPricing && orionPricing.discountPercent > 0 && cycle === "yearly" ? (
                  <span className="text-sm text-violet-300/50 line-through">
                    {formatMoney(orionPricing.listCents, currency)}
                  </span>
                ) : null}
                <span className="font-heading text-4xl font-bold text-amber-300">
                  {orionPricing ? formatMoney(orionPricing.finalCents, currency) : "—"}
                </span>
                <span className="text-sm text-violet-200/60">
                  {cycle === "yearly" ? t("orionPerYear") : t("orionPerMonth")}
                </span>
              </div>
              {cycle === "yearly" && orionPricing ? (
                <p className="mt-1 text-xs text-violet-300/60">
                  {t("orionEffectiveMonthly", {
                    value: formatMoney(Math.round(orionPricing.finalCents / 12), currency)
                  })}
                </p>
              ) : null}

              <div className="mt-4 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                {t("stackSavingsDynamic", { percent: savingsPercent })}
              </div>

              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
                  {cycle === "yearly" ? t("yearlySavingsTitle") : t("monthlySavingsTitle")}
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-emerald-200">
                  {formatBenchmarkPrice(cycle === "yearly" ? savingsYearlyCents : savingsMonthlyCents, isBr)}
                </p>
                <p className="mt-1 text-xs text-emerald-100/70">
                  {cycle === "yearly" ? t("yearlySavingsHint") : t("monthlySavingsHint")}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-300/70">
                {t("chartCompareTitle")}
              </p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fill: "rgba(196,181,253,0.85)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{
                        background: "#0f1419",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        fontSize: 12
                      }}
                      formatter={(value) => {
                        const n = Number(value);
                        return isBr
                          ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : `$${n.toFixed(0)}`;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-300/70">
                {t("chartTrendTitle")}
              </p>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "rgba(196,181,253,0.5)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "#0f1419",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        fontSize: 11
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
                    <Bar dataKey="orion" fill="#f5a623" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[10px] text-violet-400/50">{t("chartTrendHint")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
