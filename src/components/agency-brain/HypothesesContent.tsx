"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";
import { BrainListCard } from "@/components/agency-brain/BrainListCard";
import { BrainListToolbar } from "@/components/agency-brain/BrainListToolbar";
import { AgencyBrainEmptyGuide } from "@/components/agency-brain/AgencyBrainEmptyGuide";
import { AgencyBrainModuleIntro } from "@/components/agency-brain/AgencyBrainModuleIntro";
import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { parseAiAnalysisResponse } from "@/components/agency-brain/handleAiAnalysisResponse";
import { Badge } from "@/components/ui/Badge";
import { formatConfidenceBadge } from "@/lib/agency-brain/confidence-score";
import type { HypothesisDto } from "@/lib/agency-brain/domain/schemas";
import type { LearningCategory } from "@/lib/agency-brain/types";

const PAGE_SIZE = 10;

const CATEGORIES: LearningCategory[] = [
  "CREATIVE",
  "AUDIENCE",
  "OFFER",
  "COPY",
  "BUDGET",
  "LANDING_PAGE",
  "SEASONALITY",
  "GENERAL"
];

function confidenceScoreClass(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-800";
  if (score >= 50) return "bg-amber-500/10 text-amber-800";
  return "bg-rose-500/10 text-rose-800";
}

function statusVariant(status: HypothesisDto["status"]): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "CONFIRMED":
    case "PROMOTED":
      return "success";
    case "SUGGESTED":
      return "warning";
    case "REJECTED":
      return "danger";
    case "TESTING":
      return "neutral";
  }
}

export function HypothesesContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");
  const { aiDisabled, refresh: refreshAiStatus } = useAgencyBrainAi();

  const [items, setItems] = useState<HypothesisDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<HypothesisDto["status"] | "">("");
  const [sourceFilter, setSourceFilter] = useState<HypothesisDto["source"] | "">("");
  const [categoryFilter, setCategoryFilter] = useState<LearningCategory | "">("");
  const [sortBy, setSortBy] = useState<"createdAt" | "confidenceScore">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(
    async (opts?: { initial?: boolean }) => {
      if (opts?.initial) setLoading(true);
      else setListLoading(true);

      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (sourceFilter) params.set("source", sourceFilter);
        if (categoryFilter) params.set("category", categoryFilter);
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));

        const res = await fetch(
          `/api/clients/${encodeURIComponent(clientId)}/hypotheses?${params}`
        );
        const json = await res.json();
        if (json.ok) {
          setItems(json.items ?? []);
          setTotal(json.total ?? 0);
        } else {
          setMessage({ type: "err", text: json.error ?? t("hypothesesErrorLoad") });
        }
      } catch {
        setMessage({ type: "err", text: t("hypothesesErrorLoad") });
      } finally {
        setLoading(false);
        setListLoading(false);
      }
    },
    [clientId, statusFilter, sourceFilter, categoryFilter, sortBy, sortDir, page, t]
  );

  useEffect(() => {
    void load({ initial: true });
  }, [clientId]);

  useEffect(() => {
    if (!loading) void load();
  }, [statusFilter, sourceFilter, categoryFilter, sortBy, sortDir, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sourceFilter, categoryFilter, sortBy, sortDir]);

  async function handleDetectRules() {
    setDetecting(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/hypotheses/suggest`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("hypothesesErrorDetect") });
        return;
      }
      setMessage({ type: "ok", text: t("hypothesesDetectSuccess", { count: json.created ?? 0 }) });
      await load();
    } catch {
      setMessage({ type: "err", text: t("hypothesesErrorDetect") });
    } finally {
      setDetecting(false);
    }
  }

  async function handleAiSuggest() {
    setAiAnalyzing(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/hypotheses/ai-suggest`,
        { method: "POST" }
      );
      const json = await res.json();
      const parsed = parseAiAnalysisResponse(res, json, {
        aiLimit: t("aiLimit"),
        aiNoKey: t("aiNoKey"),
        aiRateLimit: t("aiRateLimit"),
        aiServiceError: t("aiServiceError"),
        aiParseError: t("aiParseError"),
        aiSchemaError: t("aiSchemaError"),
        aiNoResults: t("aiNoResults"),
        aiNoMetrics: t("aiNoMetrics"),
        aiGenericError: t("hypothesesErrorAi"),
        aiSuccess: (count) => t("hypothesesAiSuccess", { count })
      });
      if (!parsed) return;
      setMessage(parsed.message);
      if (parsed.shouldReload) await load();
      if (parsed.shouldRefreshAiStatus) await refreshAiStatus();
    } catch {
      setMessage({ type: "err", text: t("hypothesesErrorAi") });
    } finally {
      setAiAnalyzing(false);
    }
  }

  async function handleAction(
    hypothesisId: string,
    action: "confirm" | "reject" | "promote"
  ) {
    if (action === "reject" && !window.confirm(t("hypothesesConfirmReject"))) return;

    setActionLoadingId(hypothesisId);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/hypotheses/${hypothesisId}/${action}`,
        { method: "PATCH" }
      );
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("hypothesesErrorAction") });
        return;
      }
      setMessage({
        type: "ok",
        text:
          action === "confirm"
            ? t("hypothesesConfirmed")
            : action === "reject"
              ? t("hypothesesRejected")
              : t("hypothesesPromoted")
      });
      await load();
    } catch {
      setMessage({ type: "err", text: t("hypothesesErrorAction") });
    } finally {
      setActionLoadingId(null);
    }
  }

  const sortOptions = [
    { value: "createdAt", label: t("sortBy.createdAt") },
    { value: "confidenceScore", label: t("sortBy.confidence") }
  ];

  return (
    <div className="space-y-4">
      <AgencyBrainModuleIntro moduleId="hypotheses" compact />

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="ui-btn-secondary text-sm"
          onClick={() => void handleDetectRules()}
          disabled={detecting || aiAnalyzing}
        >
          {detecting ? t("hypothesesDetecting") : t("hypothesesDetectRules")}
        </button>
        <button
          type="button"
          className="ui-btn-primary text-sm"
          onClick={() => void handleAiSuggest()}
          disabled={detecting || aiAnalyzing || aiDisabled}
          title={aiDisabled ? t("aiLimit") : undefined}
        >
          {aiAnalyzing ? t("analyzingWithAi") : t("hypothesesAiSuggest")}
        </button>
      </div>

      <FeedbackBanner message={message} />

      <BrainListToolbar
        sortBy={sortBy}
        sortDir={sortDir}
        sortOptions={sortOptions}
        onSortByChange={(v) => setSortBy(v as typeof sortBy)}
        onSortDirChange={setSortDir}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        listLoading={listLoading}
        filters={
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className="ui-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as HypothesisDto["status"] | "")}
            >
              <option value="">{t("filterAllStatus")}</option>
              {(["SUGGESTED", "TESTING", "CONFIRMED", "REJECTED", "PROMOTED"] as const).map(
                (s) => (
                  <option key={s} value={s}>
                    {t(`hypothesisStatus.${s}`)}
                  </option>
                )
              )}
            </select>
            <select
              className="ui-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as HypothesisDto["source"] | "")}
            >
              <option value="">{t("filterAllSource")}</option>
              {(["RULE", "AI", "MANUAL"] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`hypothesisSource.${s}`)}
                </option>
              ))}
            </select>
            <select
              className="ui-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as LearningCategory | "")}
            >
              <option value="">{t("filterAllCategories")}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`category.${c}`)}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("loading")}</div>
      ) : items.length === 0 ? (
        <AgencyBrainEmptyGuide
          title={t("mvp_hypotheses_emptyTitle")}
          description={t("hypothesesEmpty")}
          steps={[
            t("mvp_hypotheses_step1"),
            t("mvp_hypotheses_step2"),
            t("mvp_hypotheses_step3")
          ]}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const busy = actionLoadingId === item.id;
            const canAct =
              item.status === "SUGGESTED" || item.status === "TESTING" || item.status === "CONFIRMED";

            const badges = (
              <>
                <Badge variant={statusVariant(item.status)}>
                  {t(`hypothesisStatus.${item.status}`)}
                </Badge>
                <Badge>{t(`category.${item.category}`)}</Badge>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceScoreClass(item.confidenceScore)}`}
                >
                  {t("confidenceScore", { score: formatConfidenceBadge(item.confidenceScore) })}
                </span>
                <Badge>{t(`hypothesisSource.${item.source}`)}</Badge>
              </>
            );

            const actions = (
              <div className="mt-4 flex flex-wrap gap-2">
                {canAct && item.status !== "CONFIRMED" && item.status !== "PROMOTED" ? (
                  <>
                    <button
                      type="button"
                      className="ui-btn-primary text-xs"
                      disabled={busy}
                      onClick={() => void handleAction(item.id, "confirm")}
                    >
                      {t("hypothesesConfirm")}
                    </button>
                    <button
                      type="button"
                      className="ui-btn-danger text-xs"
                      disabled={busy}
                      onClick={() => void handleAction(item.id, "reject")}
                    >
                      {t("reject")}
                    </button>
                  </>
                ) : null}
                {item.status === "CONFIRMED" ? (
                  <button
                    type="button"
                    className="ui-btn-primary text-xs"
                    disabled={busy}
                    onClick={() => void handleAction(item.id, "promote")}
                  >
                    {t("hypothesesPromote")}
                  </button>
                ) : null}
              </div>
            );

            return (
              <BrainListCard
                key={item.id}
                title={item.title}
                badges={badges}
                createdAt={item.createdAt}
                updatedAt={item.updatedAt}
              >
                <p className="text-sm text-[var(--text-dim)]">{item.description}</p>
                {item.promotedLearningId ? (
                  <p className="mt-2 text-xs text-[var(--text-dim)]">
                    {t("hypothesesPromotedLearning", { id: item.promotedLearningId.slice(0, 8) })}
                  </p>
                ) : null}
                {actions}
              </BrainListCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
