"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brain, FileText, LayoutDashboard, Megaphone, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";
import { useReducedMotion } from "@/components/marketing/motion/useReducedMotion";
import { cn } from "@/lib/cn";

const TABS = [
  { id: "creator", icon: Megaphone, labelKey: "sampleTabCreator" },
  { id: "dashboard", icon: LayoutDashboard, labelKey: "sampleTabDashboard" },
  { id: "ranking", icon: TrendingUp, labelKey: "sampleTabRanking" },
  { id: "report", icon: FileText, labelKey: "sampleTabReport" },
  { id: "brain", icon: Brain, labelKey: "sampleTabBrain" }
] as const;

type TabId = (typeof TABS)[number]["id"];

const CHART_VALUES = [
  { spend: 4200, roas: 3.1 },
  { spend: 5100, roas: 3.4 },
  { spend: 4800, roas: 3.8 },
  { spend: 6200, roas: 4.1 },
  { spend: 5900, roas: 4.2 },
  { spend: 7100, roas: 4.0 },
  { spend: 6800, roas: 4.4 }
] as const;

export function LandingProductSamples() {
  const t = useTranslations("marketing");
  const [tab, setTab] = useState<TabId>("creator");
  const reduced = useReducedMotion();

  return (
    <section id="product" className="marketing-section marketing-section-alt">
      <div className="mx-auto max-w-6xl">
        <MarketingReveal className="mb-10 text-center">
          <p className="marketing-section-title">{t("sampleBadge")}</p>
          <h2 className="marketing-section-heading">{t("sampleTitle")}</h2>
          <p className="marketing-section-sub mx-auto max-w-2xl">{t("sampleSubtitle")}</p>
        </MarketingReveal>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {TABS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition",
                tab === id
                  ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--text-main)]"
                  : "border-[var(--border-color)] bg-[var(--surface-card)] text-[var(--text-dim)] hover:text-[var(--text-main)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="overflow-hidden rounded-xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg)] p-4 shadow-2xl shadow-black/25 ring-1 ring-[var(--ui-accent-border)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {tab === "creator" ? <CreatorSample t={t} /> : null}
                {tab === "dashboard" ? <DashboardSample t={t} /> : null}
                {tab === "ranking" ? <RankingSample t={t} /> : null}
                {tab === "report" ? <ReportSample t={t} /> : null}
                {tab === "brain" ? <BrainSample t={t} /> : null}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="marketing-card">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t(`sample${capitalize(tab)}Title`)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
              {t(`sample${capitalize(tab)}Body`)}
            </p>
            <ul className="mt-4 space-y-2">
              {(["Point1", "Point2", "Point3"] as const).map((suffix) => (
                <li key={suffix} className="flex items-start gap-2 text-xs text-[var(--text-main)]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ui-accent)]" />
                  {t(`sample${capitalize(tab)}${suffix}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function CreatorSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  const steps = [
    { label: t("sampleCreatorStep1"), active: true, current: true },
    { label: t("sampleCreatorStep2"), active: true, current: false },
    { label: t("sampleCreatorStep3"), active: false, current: false }
  ];
  return (
    <div className="space-y-3">
      <p className="campaign-creator-orion-section-label">{t("sampleCreatorHeader")}</p>
      <div className="flex gap-1.5">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className={cn(
              "flex-1 rounded-lg border px-2 py-2 text-center text-[10px] font-semibold",
              step.current
                ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                : step.active
                  ? "border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] text-[var(--text-dim)]"
                  : "border-[var(--creator-card-border)] text-[var(--text-dimmer)]"
            )}
          >
            {String(i + 1).padStart(2, "0")} · {step.label}
          </div>
        ))}
      </div>
      <section className="campaign-creator-card campaign-creator-card--compact">
        <p className="text-[10px] font-semibold text-[var(--ui-accent)]">{t("sampleCreatorFieldObjective")}</p>
        <div className="rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2.5 py-2 text-[10px] text-[var(--text-main)]">
          {t("sampleCreatorFieldPersona")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2.5 py-2 text-[10px] text-[var(--text-dim)]">
            {t("sampleCreatorFieldBudget")}
          </div>
          <div className="rounded-lg border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-2.5 py-2 text-[10px] font-medium text-[var(--ui-accent)]">
            {t("sampleCreatorFieldChannel")}
          </div>
        </div>
        <button type="button" className="ui-btn-accent mt-1 inline-flex px-3 py-1.5 text-[10px] font-bold">
          {t("sampleCreatorCta")}
        </button>
      </section>
    </div>
  );
}

function DashboardSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  const chartPoints = CHART_VALUES.map((point, i) => ({
    ...point,
    d: t(`sampleChartDay${i + 1}` as "sampleChartDay1")
  }));
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-dim)]">{t("sampleDashboardClient")}</span>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200 ring-1 ring-emerald-400/30">
          {t("sampleLiveBadge")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "ROAS", value: "4.2x", up: true },
          { label: "CPA", value: "R$ 18", up: false },
          { label: "Spend", value: "R$ 6,8k", up: true }
        ].map((kpi) => (
          <div key={kpi.label} className="dashboard-kpi-card dashboard-kpi-card--mini !min-h-0 !py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">{kpi.label}</div>
            <div className="mt-0.5 flex items-center gap-1 font-heading text-base font-bold text-[var(--text-main)]">
              {kpi.value}
              {kpi.up ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : null}
            </div>
          </div>
        ))}
      </div>
      <p className="campaign-creator-orion-section-label mb-2 mt-4">{t("sampleDashboardChartLabel")}</p>
      <div className="dashboard-card dashboard-card--compact !p-2">
        <div className="dashboard-kpi-card__spark h-[160px] !min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartPoints}>
              <XAxis dataKey="d" tick={{ fill: "var(--text-dimmer)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "var(--creator-card-bg)",
                  border: "1px solid var(--creator-card-border)",
                  borderRadius: 10,
                  fontSize: 11
                }}
              />
              <Line type="monotone" dataKey="roas" stroke="var(--ui-accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RankingSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  const rows = [
    { name: t("sampleRankingRow1"), score: "+340%", rank: 1 },
    { name: t("sampleRankingRow2"), score: "+210%", rank: 2 },
    { name: t("sampleRankingRow3"), score: "+85%", rank: 3 }
  ];
  return (
    <div className="space-y-2">
      <p className="campaign-creator-orion-section-label mb-3">{t("sampleRankingHeader")}</p>
      {rows.map((row) => (
        <div
          key={row.rank}
          className="flex items-center gap-3 rounded-xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-3 py-2.5"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-xs font-black text-[var(--ui-accent)]">
            #{row.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-main)]">{row.name}</p>
            <p className="text-[10px] text-[var(--text-dimmer)]">{t("sampleRankingVsAvg")}</p>
          </div>
          <span className="text-sm font-bold text-emerald-300">{row.score}</span>
        </div>
      ))}
    </div>
  );
}

function ReportSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  return (
    <div className="campaign-creator-card">
      <div className="flex items-center justify-between border-b border-[var(--creator-card-border)] pb-3">
        <div>
          <p className="campaign-creator-orion-section-label">{t("sampleReportWeekly")}</p>
          <p className="font-heading text-sm font-bold text-[var(--text-main)]">{t("sampleReportTitleDoc")}</p>
        </div>
        <FileText className="h-5 w-5 text-[var(--ui-accent)]" />
      </div>
      <div className="mt-3 space-y-2 text-xs text-[var(--text-dim)]">
        <p>• {t("sampleReportLine1")}</p>
        <p>• {t("sampleReportLine2")}</p>
        <p>• {t("sampleReportLine3")}</p>
      </div>
      <span className="ui-btn-accent-outline mt-4 inline-flex px-3 py-1.5 text-[10px] font-semibold">
        {t("sampleReportAutoSend")}
      </span>
    </div>
  );
}

function BrainSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  return (
    <div className="campaign-creator-sidebar-card !p-3">
      <p className="font-heading text-xs font-semibold text-[var(--text-main)]">{t("sampleBrainHeader")}</p>
      <div className="campaign-creator-sidebar-card-inset mt-3 space-y-2 !px-0 !py-0">
        {[
          { type: "suggestion", text: t("sampleBrainItem1") },
          { type: "learning", text: t("sampleBrainItem2") },
          { type: "hypothesis", text: t("sampleBrainItem3") }
        ].map((item, i) => (
          <div key={i} className="border-b border-[var(--creator-card-border)] px-3 py-2.5 last:border-0">
            <span className="campaign-creator-orion-section-label text-[var(--ui-accent)]">
              {t(`sampleBrainType_${item.type}`)}
            </span>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-main)]">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
