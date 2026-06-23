"use client";

import { BarChart3, Globe2, Layers, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { isBrBillingMode } from "@/lib/billing/currency";
import { STACK_BENCHMARK_TOOLS } from "@/lib/marketing/stack-benchmarks";

const MARKET_PIE = [
  { key: "pieReports", pct: 32, fill: "#7c3aed" },
  { key: "pieBi", pct: 24, fill: "#6366f1" },
  { key: "pieAutomation", pct: 18, fill: "#f5a623" },
  { key: "pieAi", pct: 16, fill: "#10b981" },
  { key: "pieOther", pct: 10, fill: "#64748b" }
] as const;

export function LandingMarketInsights() {
  const t = useTranslations("marketing");
  const locale = useLocale();
  const isBr = isBrBillingMode(locale);

  const toolCostData = [
    "supermetricsGrowth",
    "dashthisPro",
    "zapierTeam",
    "chatgptTeam2",
    "motionPro"
  ].map((id) => {
    const tool = STACK_BENCHMARK_TOOLS[id];
    const cents = isBr ? tool.monthlyBrlCents : tool.monthlyUsdCents;
    return {
      name: t(tool.labelKey),
      value: cents / 100
    };
  });

  const pieData = MARKET_PIE.map((s) => ({
    name: t(s.key),
    value: s.pct,
    fill: s.fill
  }));

  const stats = [
    { icon: Globe2, valueKey: "marketStat1Value", labelKey: "marketStat1Label" },
    { icon: Users, valueKey: "marketStat2Value", labelKey: "marketStat2Label" },
    { icon: Layers, valueKey: "marketStat3Value", labelKey: "marketStat3Label" },
    { icon: BarChart3, valueKey: "marketStat4Value", labelKey: "marketStat4Label" }
  ] as const;

  return (
    <section id="market" className="border-b border-white/5 bg-[#0a0f14] px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400/90">
            {t("marketBadge")}
          </p>
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("marketTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-violet-200/70">
            {t("marketSubtitle")}
          </p>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ icon: Icon, valueKey, labelKey }) => (
            <div
              key={valueKey}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/25"
            >
              <Icon className="mb-3 h-5 w-5 text-amber-400/90" />
              <p className="font-heading text-2xl font-bold text-white">{t(valueKey)}</p>
              <p className="mt-1 text-xs leading-relaxed text-violet-200/65">{t(labelKey)}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-heading text-sm font-semibold text-white">{t("marketChartToolsTitle")}</h3>
            <p className="mt-1 text-xs text-violet-200/60">{t("marketChartToolsSub")}</p>
            <div className="mt-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolCostData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "rgba(196,181,253,0.55)", fontSize: 9 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={56}
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
                      formatter={(value) => {
                        const n = Number(value);
                        return isBr
                          ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : `$${n.toFixed(0)}`;
                      }}
                  />
                  <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-heading text-sm font-semibold text-white">{t("marketChartBudgetTitle")}</h3>
            <p className="mt-1 text-xs text-violet-200/60">{t("marketChartBudgetSub")}</p>
            <div className="mt-2 flex flex-col items-center sm:flex-row sm:gap-4">
              <div className="h-[220px] w-full sm:w-[55%]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0f1419",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        fontSize: 11
                      }}
                      formatter={(value) => `${Number(value)}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-2 sm:w-[45%]">
                {pieData.map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 text-violet-200/80">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.fill }} />
                      {item.name}
                    </span>
                    <span className="font-semibold text-white">{item.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-violet-400/45">{t("marketSourcesNote")}</p>
      </div>
    </section>
  );
}
