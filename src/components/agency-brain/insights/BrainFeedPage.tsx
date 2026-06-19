"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";
import { BrainFeedHero } from "@/components/agency-brain/insights/BrainFeedHero";
import { BrainFeedSearch } from "@/components/agency-brain/insights/BrainFeedSearch";
import { HypothesisFeedCard } from "@/components/agency-brain/insights/HypothesisFeedCard";
import { LearningFeedCard } from "@/components/agency-brain/insights/LearningFeedCard";
import { LearningsViewTabs } from "@/components/agency-brain/insights/LearningsViewTabs";
import { RefineResearchBar } from "@/components/agency-brain/insights/RefineResearchBar";
import { ResearchLogsList } from "@/components/agency-brain/insights/ResearchLogsList";
import { useBrainInsights } from "@/components/agency-brain/insights/useBrainInsights";
import { getResearchLogs } from "@/lib/agency-brain/insights/research-log-repository";
import type { FeedTab, LearningsSubView } from "@/lib/agency-brain/insights/types";

export type FeedVariant = "learnings" | "hypotheses";

export function BrainFeedPage({ variant }: { variant: FeedVariant }) {
  const t = useTranslations("brainInsights");
  const { clientSlug } = useAgencyBrainClient();
  const insights = useBrainInsights();
  const tab: FeedTab = variant;
  const [search, setSearch] = useState("");
  const [learningsView, setLearningsView] = useState<LearningsSubView>("feed");
  const [logsRevision, setLogsRevision] = useState(0);

  const stats = useMemo(() => insights.getFeedStats(), [insights]);
  const items = useMemo(
    () => insights.getFeedItems({ tab, search }),
    [insights, tab, search]
  );
  const researchLogs = useMemo(
    () => getResearchLogs(clientSlug),
    [clientSlug, logsRevision]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <BrainFeedHero variant={variant} stats={stats} />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {variant === "learnings" ? (
            <>
              <RefineResearchBar
                clientId={clientSlug}
                onComplete={() => setLogsRevision((r) => r + 1)}
              />
              <LearningsViewTabs selected={learningsView} onSelect={setLearningsView} />
            </>
          ) : (
            <span />
          )}
        </div>
        {variant === "learnings" && learningsView === "feed" ? (
          <BrainFeedSearch variant={variant} value={search} onChange={setSearch} />
        ) : variant === "hypotheses" ? (
          <BrainFeedSearch variant={variant} value={search} onChange={setSearch} />
        ) : null}
      </div>

      <div className="brain-insights-scroll min-h-0 flex-1 overflow-y-auto pr-0.5">
        <div className="space-y-3 pb-2">
          {variant === "learnings" && learningsView === "logs" ? (
            <ResearchLogsList logs={researchLogs} />
          ) : variant === "learnings" ? (
            items.map((item) =>
              item.kind === "learning" ? (
                <LearningFeedCard key={item.learning.id} learning={item.learning} />
              ) : null
            )
          ) : (
            items.map((item) =>
              item.kind === "hypothesis" ? (
                <HypothesisFeedCard
                  key={item.hypothesis.id}
                  hypothesis={item.hypothesis}
                  learningTitle={item.learningTitle}
                />
              ) : null
            )
          )}
          {variant === "learnings" && learningsView === "feed" && items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
              {t("learningsEmpty")}
            </p>
          ) : null}
          {variant === "hypotheses" && items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
              {t("hypothesesEmpty")}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BrainLearningsPage() {
  return <BrainFeedPage variant="learnings" />;
}

export function BrainHypothesesPage() {
  return <BrainFeedPage variant="hypotheses" />;
}
