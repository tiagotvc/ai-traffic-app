"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";
import { BrainFeedHero } from "@/components/agency-brain/insights/BrainFeedHero";
import { HypothesisFeedCard } from "@/components/agency-brain/insights/HypothesisFeedCard";
import { LearningFeedCard } from "@/components/agency-brain/insights/LearningFeedCard";
import { LearningTimelinePanel } from "@/components/agency-brain/insights/LearningTimelinePanel";
import { ResearchLogsList } from "@/components/agency-brain/insights/ResearchLogsList";
import { useBrainInsights } from "@/components/agency-brain/insights/useBrainInsights";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";
import { getResearchLogs } from "@/lib/agency-brain/insights/research-log-repository";
import type { FeedTab, InsightLearning } from "@/lib/agency-brain/insights/types";

export type FeedVariant = "learnings" | "hypotheses";

const PAGE_SIZE = 10;

const MAIN_TABS: Array<{ id: FeedTab | "logs"; href?: string }> = [
  { id: "learnings", href: "/agency-brain/learnings" },
  { id: "hypotheses", href: "/agency-brain/hypotheses" },
  { id: "logs" }
];

export function BrainFeedPage({ variant }: { variant: FeedVariant }) {
  const t = useTranslations("brainInsights");
  const { clientSlug } = useAgencyBrainClient();
  const insights = useBrainInsights();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [logsRevision, setLogsRevision] = useState(0);
  const [activeLogs, setActiveLogs] = useState(false);
  const [timelineLearning, setTimelineLearning] = useState<InsightLearning | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, variant, clientSlug]);

  const items = useMemo(
    () => insights.getFeedItems({ tab: variant, search }),
    [insights, variant, search]
  );
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);
  const researchLogs = useMemo(
    () => getResearchLogs(clientSlug),
    [clientSlug, logsRevision]
  );

  const showLogs = activeLogs && variant === "learnings";

  return (
    <div className="space-y-5">
      <BrainFeedHero
        variant={variant}
        clientId={clientSlug}
        onRefineComplete={() => setLogsRevision((r) => r + 1)}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1">
          {MAIN_TABS.map((tab) => {
            const isLogs = tab.id === "logs";
            const active = isLogs ? showLogs : !showLogs && variant === tab.id;

            if (isLogs) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveLogs(true)}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
                  style={{
                    background: active ? "#f5a623" : "var(--surface-card)",
                    color: active ? "#0f1419" : "var(--text-dim)",
                    border: active ? "1px solid #f5a623" : "1px solid var(--border-color)",
                    fontWeight: active ? 600 : 400
                  }}
                >
                  {t("mainTab.logs")}
                </button>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href!}
                onClick={() => setActiveLogs(false)}
                className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all"
                style={{
                  background: active ? "#f5a623" : "var(--surface-card)",
                  color: active ? "#0f1419" : "var(--text-dim)",
                  border: active ? "1px solid #f5a623" : "1px solid var(--border-color)",
                  fontWeight: active ? 600 : 400
                }}
              >
                {t(`mainTab.${tab.id}`)}
              </Link>
            );
          })}
        </div>

        {!showLogs ? (
          <div
            className="flex min-w-[200px] items-center gap-2 rounded-lg border px-3 py-1.5"
            style={{ background: "var(--surface-card)", borderColor: "#f5a623" }}
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: "var(--text-dimmer)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={
                variant === "learnings"
                  ? t("searchLearningsPlaceholder")
                  : t("searchHypothesesPlaceholder")
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-none bg-transparent text-sm outline-none"
              style={{ color: "var(--text-main)" }}
            />
          </div>
        ) : null}
      </div>

      {variant === "learnings" && !showLogs ? (
        <div
          className="mb-5 flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(245,166,35,0.07)",
            border: "1px solid rgba(245,166,35,0.2)",
            color: "var(--text-dim)"
          }}
        >
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#f5a623"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{t("learningsInfoBanner")}</span>
        </div>
      ) : null}

      <div className="space-y-3 pb-6">
        {showLogs ? (
          <ResearchLogsList logs={researchLogs} />
        ) : insights.loading ? (
          <ListSkeleton rows={PAGE_SIZE} />
        ) : variant === "learnings" ? (
          pagedItems.map((item) =>
            item.kind === "learning" ? (
              <LearningFeedCard
                key={item.learning.id}
                learning={item.learning}
                onTimeline={() => setTimelineLearning(item.learning)}
              />
            ) : null
          )
        ) : (
          pagedItems.map((item) =>
            item.kind === "hypothesis" ? (
              <HypothesisFeedCard
                key={item.hypothesis.id}
                hypothesis={item.hypothesis}
                learningTitle={item.learningTitle}
              />
            ) : null
          )
        )}

        {!showLogs && !insights.loading && items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-semibold" style={{ color: "var(--text-dim)" }}>
              {variant === "learnings" ? t("learningsEmpty") : t("hypothesesEmpty")}
            </p>
          </div>
        ) : null}

        {!showLogs && !insights.loading && totalPages > 1 ? (
          <div
            className="flex items-center justify-between rounded-xl border px-4 py-3"
            style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
          >
            <p className="text-xs" style={{ color: "var(--text-dimmer)" }}>
              {items.length}{" "}
              {variant === "learnings" ? t("learningsCountLabel") : t("hypothesesCountLabel")}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border px-3 py-1 text-xs disabled:opacity-40"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                {t("paginationPrev")}
              </button>
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border px-3 py-1 text-xs disabled:opacity-40"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                {t("paginationNext")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {timelineLearning ? (
        <LearningTimelinePanel
          learning={timelineLearning}
          events={insights.getTimelineForLearning(timelineLearning.id)}
          onClose={() => setTimelineLearning(null)}
        />
      ) : null}
    </div>
  );
}

export function BrainLearningsPage() {
  return <BrainFeedPage variant="learnings" />;
}

export function BrainHypothesesPage() {
  return <BrainFeedPage variant="hypotheses" />;
}
