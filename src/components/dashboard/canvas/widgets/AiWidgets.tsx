"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Brain, TrendingDown, TrendingUp } from "lucide-react";

import { BrainShelf } from "@/components/dashboard/BrainShelf";
import { Link } from "@/i18n/navigation";
import type { AccountHealthScore } from "@/lib/dashboard/account-health-score";
import { useWidgetData } from "@/uxpilot-ui/adapters/useWidgetData";
import { toBrainShelfLearnings } from "@/uxpilot-ui/adapters/dashboard-mappers";

type AgencyBrainData = {
  score: { score: number; learningsCount: number; hypothesesCount: number; opportunitiesCount: number };
  learnings: Array<{ id: string; title: string; body: string; impact?: string }>;
  hypotheses: Array<{ id: string; title: string; status?: string }>;
  opportunities: Array<{ id: string; title: string; body: string }>;
};

export function AgencyBrainWidget() {
  const t = useTranslations("dashboardWidgets");
  const { data, loading } = useWidgetData<AgencyBrainData>("ai.agencyBrain");

  if (loading || !data) {
    return <div className="text-xs" style={{ color: "var(--text-dim)" }}>{t("loading")}</div>;
  }

  const score = data.score?.score ?? 0;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl font-heading text-xl font-bold"
            style={{
              background: "rgba(124,58,237,0.12)",
              color: score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444"
            }}
          >
            {score}
          </div>
          <div>
            <p className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              {t("agencyBrainScore")}
            </p>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {t("agencyBrainScoreHint", {
                learnings: data.score?.learningsCount ?? 0,
                hypotheses: data.score?.hypothesesCount ?? 0
              })}
            </p>
          </div>
        </div>
        <Link
          href="/agency-brain"
          className="flex items-center gap-1 text-xs font-semibold"
          style={{ color: "#7c3aed" }}
        >
          {t("viewAgencyBrain")}
          <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <BrainList title={t("recentLearnings")} items={data.learnings.slice(0, 3)} />
        <BrainList
          title={t("hypotheses")}
          items={data.hypotheses.slice(0, 3).map((h) => ({ id: h.id, title: h.title, body: h.status ?? "" }))}
        />
        <BrainList title={t("opportunities")} items={data.opportunities.slice(0, 3)} />
      </div>
    </div>
  );
}

function BrainList({
  title,
  items
}: {
  title: string;
  items: Array<{ id: string; title: string; body: string }>;
}) {
  return (
    <div
      className="rounded-lg border p-2.5"
      style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>—</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="text-xs" style={{ color: "var(--text-main)" }}>
              <span className="font-medium">{item.title}</span>
              {item.body ? (
                <span className="block truncate text-[11px]" style={{ color: "var(--text-dim)" }}>
                  {item.body}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AccountHealthWidget() {
  const t = useTranslations("dashboardWidgets");
  const { data, loading } = useWidgetData<AccountHealthScore>("ai.accountHealth");

  if (loading || !data) {
    return <div className="text-xs" style={{ color: "var(--text-dim)" }}>{t("loading")}</div>;
  }

  const TrendIcon = data.trend === "up" ? TrendingUp : data.trend === "down" ? TrendingDown : Brain;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full font-heading text-2xl font-bold"
          style={{
            background: "rgba(34,197,94,0.12)",
            color: data.score >= 70 ? "#22c55e" : data.score >= 40 ? "#f59e0b" : "#ef4444"
          }}
        >
          {data.score}
        </div>
        <div>
          <p className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            {t("accountHealth")}
          </p>
          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-dim)" }}>
            <TrendIcon size={12} />
            {t(`trend_${data.trend}`)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(data.breakdown).slice(0, 6).map(([key, val]) => (
          <div key={key} className="rounded-md px-2 py-1.5" style={{ background: "var(--surface-bg)" }}>
            <p className="text-[10px] uppercase" style={{ color: "var(--text-dimmer)" }}>
              {key}
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              {val.score}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentLearningsWidget({
  learnings,
  loading
}: {
  learnings: ReturnType<typeof toBrainShelfLearnings>;
  loading: boolean;
}) {
  return <BrainShelf suggestions={learnings} isLoading={loading} variant="shelf" />;
}
