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

const CHART_POINTS = [
  { d: "Seg", spend: 4200, roas: 3.1 },
  { d: "Ter", spend: 5100, roas: 3.4 },
  { d: "Qua", spend: 4800, roas: 3.8 },
  { d: "Qui", spend: 6200, roas: 4.1 },
  { d: "Sex", spend: 5900, roas: 4.2 },
  { d: "Sáb", spend: 7100, roas: 4.0 },
  { d: "Dom", spend: 6800, roas: 4.4 }
];

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
          <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-5 shadow-2xl shadow-black/25">
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
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--amber-bright)]" />
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
    { label: t("sampleCreatorStep1"), active: true },
    { label: t("sampleCreatorStep2"), active: true },
    { label: t("sampleCreatorStep3"), active: false }
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[var(--text-dim)]">{t("sampleCreatorHeader")}</p>
      <div className="flex gap-2">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className={cn(
              "flex-1 rounded-xl border px-2 py-2 text-center text-[10px] font-semibold",
              step.active
                ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                : "border-[var(--border-color)] text-[var(--text-dimmer)]"
            )}
          >
            {String(i + 1).padStart(2, "0")} · {step.label}
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-3">
        <div className="h-2 w-24 rounded bg-[var(--ui-accent-muted)]" />
        <div className="h-8 rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)]" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)]" />
          <div className="h-8 rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)]" />
        </div>
        <div className="mt-2 inline-flex rounded-lg bg-[var(--ui-accent)] px-3 py-1.5 text-[10px] font-bold text-[var(--ui-accent-btn-text)]">
          {t("sampleCreatorCta")}
        </div>
      </div>
    </div>
  );
}

function DashboardSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-dim)]">{t("sampleDashboardClient")}</span>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
          {t("sampleLiveBadge")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "ROAS", value: "4.2x", up: true },
          { label: "CPA", value: "R$ 18", up: false },
          { label: "Spend", value: "R$ 6,8k", up: true }
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">{kpi.label}</div>
            <div className="mt-1 flex items-center gap-1 font-heading text-lg font-bold text-[var(--text-main)]">
              {kpi.value}
              {kpi.up ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-[180px] rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={CHART_POINTS}>
            <XAxis dataKey="d" tick={{ fill: "var(--text-dimmer)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                fontSize: 11
              }}
            />
            <Line type="monotone" dataKey="roas" stroke="var(--amber-bright)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RankingSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  const rows = [
    { name: "Hook #1 — Dor + prova", score: "+340%", rank: 1 },
    { name: "UGC 15s — depoimento", score: "+210%", rank: 2 },
    { name: "Estático — oferta", score: "+85%", rank: 3 }
  ];
  return (
    <div className="space-y-2">
      <p className="mb-3 text-xs font-semibold text-[var(--text-dim)]">{t("sampleRankingHeader")}</p>
      {rows.map((row) => (
        <div
          key={row.rank}
          className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-2.5"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-xs font-black text-[var(--amber-bright)]">
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
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-4">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">{t("sampleReportWeekly")}</p>
          <p className="font-heading text-sm font-bold text-[var(--text-main)]">{t("sampleReportTitleDoc")}</p>
        </div>
        <FileText className="h-5 w-5 text-[var(--amber-bright)]" />
      </div>
      <div className="mt-3 space-y-2 text-xs text-[var(--text-dim)]">
        <p>• {t("sampleReportLine1")}</p>
        <p>• {t("sampleReportLine2")}</p>
        <p>• {t("sampleReportLine3")}</p>
      </div>
      <div className="mt-4 inline-flex rounded-lg bg-[var(--ui-accent-muted)] px-3 py-1.5 text-[10px] font-semibold text-[var(--ui-accent)]">
        {t("sampleReportAutoSend")}
      </div>
    </div>
  );
}

function BrainSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[var(--text-dim)]">{t("sampleBrainHeader")}</p>
      {[
        { type: "suggestion", text: t("sampleBrainItem1") },
        { type: "learning", text: t("sampleBrainItem2") },
        { type: "hypothesis", text: t("sampleBrainItem3") }
      ].map((item, i) => (
        <div key={i} className="rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-3 py-2.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--amber-bright)]">
            {t(`sampleBrainType_${item.type}`)}
          </span>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-main)]">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
