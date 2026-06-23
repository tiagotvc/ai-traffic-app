"use client";

import { Brain, FileText, LayoutDashboard, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/cn";

const TABS = [
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
  const [tab, setTab] = useState<TabId>("dashboard");

  return (
    <section id="samples" className="border-b border-white/5 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400/90">
            {t("sampleBadge")}
          </p>
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("sampleTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-violet-200/70">
            {t("sampleSubtitle")}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {TABS.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition",
                tab === id
                  ? "border-violet-400/40 bg-violet-500/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-violet-200/70 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/90 via-indigo-950/90 to-slate-950/90 p-5 shadow-2xl shadow-violet-950/30">
            {tab === "dashboard" ? <DashboardSample t={t} /> : null}
            {tab === "ranking" ? <RankingSample t={t} /> : null}
            {tab === "report" ? <ReportSample t={t} /> : null}
            {tab === "brain" ? <BrainSample t={t} /> : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-heading text-sm font-semibold text-white">{t(`sample${capitalize(tab)}Title`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-violet-200/70">{t(`sample${capitalize(tab)}Body`)}</p>
            <ul className="mt-4 space-y-2">
              {(["Point1", "Point2", "Point3"] as const).map((suffix) => (
                <li key={suffix} className="flex items-start gap-2 text-xs text-violet-100/85">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
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

function DashboardSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-violet-200/70">{t("sampleDashboardClient")}</span>
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
          <div key={kpi.label} className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
            <div className="text-[10px] uppercase tracking-wide text-violet-300/60">{kpi.label}</div>
            <div className="mt-1 flex items-center gap-1 font-heading text-lg font-bold text-white">
              {kpi.value}
              {kpi.up ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-[180px] rounded-xl border border-white/10 bg-black/20 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={CHART_POINTS}>
            <XAxis dataKey="d" tick={{ fill: "rgba(196,181,253,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "#0f1419",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                fontSize: 11
              }}
            />
            <Line type="monotone" dataKey="roas" stroke="#f5a623" strokeWidth={2} dot={false} />
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
      <p className="mb-3 text-xs font-semibold text-violet-200/70">{t("sampleRankingHeader")}</p>
      {rows.map((row) => (
        <div
          key={row.rank}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-xs font-black text-amber-300">
            #{row.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{row.name}</p>
            <p className="text-[10px] text-violet-300/60">{t("sampleRankingVsAvg")}</p>
          </div>
          <span className="text-sm font-bold text-emerald-300">{row.score}</span>
        </div>
      ))}
    </div>
  );
}

function ReportSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.06] p-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-violet-300/60">{t("sampleReportWeekly")}</p>
          <p className="font-heading text-sm font-bold text-white">{t("sampleReportTitleDoc")}</p>
        </div>
        <FileText className="h-5 w-5 text-amber-400/80" />
      </div>
      <div className="mt-3 space-y-2 text-xs text-violet-100/85">
        <p>• {t("sampleReportLine1")}</p>
        <p>• {t("sampleReportLine2")}</p>
        <p>• {t("sampleReportLine3")}</p>
      </div>
      <div className="mt-4 inline-flex rounded-lg bg-amber-400/15 px-3 py-1.5 text-[10px] font-semibold text-amber-200">
        {t("sampleReportAutoSend")}
      </div>
    </div>
  );
}

function BrainSample({ t }: { t: ReturnType<typeof useTranslations<"marketing">> }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-violet-200/70">{t("sampleBrainHeader")}</p>
      {[
        { type: "suggestion", text: t("sampleBrainItem1") },
        { type: "learning", text: t("sampleBrainItem2") },
        { type: "hypothesis", text: t("sampleBrainItem3") }
      ].map((item, i) => (
        <div key={i} className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
            {t(`sampleBrainType_${item.type}`)}
          </span>
          <p className="mt-1 text-xs leading-relaxed text-violet-100/90">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
