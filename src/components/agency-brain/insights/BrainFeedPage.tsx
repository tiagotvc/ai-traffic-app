"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";

import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterSearchInput } from "@/components/FilterSearchInput";
import { BrainFeedHero } from "@/components/agency-brain/insights/BrainFeedHero";
import { HypothesisFeedCard } from "@/components/agency-brain/insights/HypothesisFeedCard";
import { LearningFeedCard } from "@/components/agency-brain/insights/LearningFeedCard";
import { LearningTimelinePanel } from "@/components/agency-brain/insights/LearningTimelinePanel";
import { useBrainInsights } from "@/components/agency-brain/insights/useBrainInsights";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useRouter } from "@/i18n/navigation";
import type {
  InsightLearning,
  LearningTimelineEvent,
  TimelineEventType
} from "@/lib/agency-brain/insights/types";

/** Mapeia o tipo de evento do backend para o tipo visual do painel de timeline. */
function mapTimelineType(type: string): TimelineEventType {
  switch (type) {
    case "market_scanned":
      return "market_signal";
    case "competitor_compared":
      return "competitor_signal";
    case "learning_approved":
    case "hypothesis_promoted":
    case "metric_spike":
      return "reinforced";
    case "hypothesis_confirmed":
      return "hypothesis_validated";
    case "suggestion_executed":
    case "suggestion_created":
      return "agency_pattern";
    case "sync_completed":
      return "client_pattern";
    default:
      return "created";
  }
}

function strArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : undefined;
}

export type FeedVariant = "learnings" | "hypotheses";

const PAGE_SIZE = 10;

export function BrainFeedPage({ variant }: { variant: FeedVariant }) {
  const t = useTranslations("brainInsights");
  const { clientSlug, clients, onClientChange } = useAgencyBrainClient();
  const insights = useBrainInsights();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [timelineLearning, setTimelineLearning] = useState<InsightLearning | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<LearningTimelineEvent[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  async function openTimeline(learning: InsightLearning) {
    setTimelineLearning(learning);
    // Fallback: evento sintético enquanto a timeline real carrega.
    setTimelineEvents(insights.getTimelineForLearning(learning.id));
    if (!clientSlug) return;
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientSlug)}/timeline?pageSize=40`
      );
      const json = await res.json();
      if (res.ok && json?.ok && Array.isArray(json.items) && json.items.length > 0) {
        setTimelineEvents(
          json.items.map(
            (ev: {
              id: string;
              type: string;
              title: string;
              description: string | null;
              metadata: Record<string, unknown> | null;
              createdAt: string;
            }): LearningTimelineEvent => ({
              id: ev.id,
              learningId: learning.id,
              date: ev.createdAt,
              title: ev.title,
              description: ev.description ?? "",
              confidenceBefore: null,
              confidenceAfter: null,
              eventType: mapTimelineType(ev.type),
              evidence: ev.metadata
                ? {
                    competitors: strArray(ev.metadata.competitors),
                    sampleAdUrls: strArray(ev.metadata.sampleAdUrls),
                    patterns: strArray(ev.metadata.patterns)
                  }
                : undefined
            })
          )
        );
      }
    } catch {
      /* mantém o fallback */
    }
  }

  useEffect(() => {
    setPage(1);
  }, [search, variant, clientSlug]);

  async function handleApprove(learning: InsightLearning) {
    if (!clientSlug) return;
    const force = learning.confidenceScore < 50;
    if (force && !window.confirm(t("approveLowConfidenceConfirm"))) return;
    setActionId(learning.id);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientSlug)}/learnings/${encodeURIComponent(learning.id)}/approve`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ force })
        }
      );
      if (res.ok) insights.refresh?.();
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(learning: InsightLearning) {
    if (!clientSlug) return;
    setActionId(learning.id);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientSlug)}/learnings/${encodeURIComponent(learning.id)}/reject`,
        { method: "PATCH" }
      );
      if (res.ok) insights.refresh?.();
    } finally {
      setActionId(null);
    }
  }

  async function handleGenerateHypothesis(learning: InsightLearning) {
    if (!clientSlug) return;
    setActionId(learning.id);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientSlug)}/hypotheses`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: t("hypothesisFromLearningTitle", { title: learning.title }),
            description: learning.description || learning.evidenceSummary || learning.title,
            category: "GENERAL"
          })
        }
      );
      if (res.ok) router.push("/agency-brain/hypotheses");
    } finally {
      setActionId(null);
    }
  }

  const items = useMemo(
    () => insights.getFeedItems({ tab: variant, search }),
    [insights, variant, search]
  );
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  return (
    <div className="space-y-5">
      <BrainFeedHero variant={variant} />

      {/* Filtro de cliente + busca. As pills (Aprendizados/Hipóteses/Logs) foram removidas:
          a navegação entre módulos já existe no sidebar. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterSelectDropdown
          icon={<Building2 size={14} />}
          label={t("clientLabel")}
          placeholder={t("clientLabel")}
          value={clientSlug}
          onChange={onClientChange}
          clearable={false}
          options={clients.map((c) => ({ value: c.slug, label: c.name }))}
        />

        <FilterSearchInput
          size="wide"
          value={search}
          onChange={setSearch}
          placeholder={
            variant === "learnings"
              ? t("searchLearningsPlaceholder")
              : t("searchHypothesesPlaceholder")
          }
        />
      </div>

      {variant === "learnings" ? (
        <div className="ui-alert-learnings mb-5">
          <svg
            className="ui-alert-learnings__icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
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
        {insights.loading ? (
          <ListSkeleton rows={PAGE_SIZE} />
        ) : variant === "learnings" ? (
          pagedItems.map((item) =>
            item.kind === "learning" ? (
              <LearningFeedCard
                key={item.learning.id}
                learning={item.learning}
                onTimeline={() => void openTimeline(item.learning)}
                onApprove={handleApprove}
                onReject={handleReject}
                onGenerateHypothesis={handleGenerateHypothesis}
                busy={actionId === item.learning.id}
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

        {!insights.loading && items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-semibold" style={{ color: "var(--text-dim)" }}>
              {variant === "learnings" ? t("learningsEmpty") : t("hypothesesEmpty")}
            </p>
          </div>
        ) : null}

        {!insights.loading && totalPages > 1 ? (
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
          events={timelineEvents}
          onClose={() => {
            setTimelineLearning(null);
            setTimelineEvents([]);
          }}
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
