"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { BrainListCard } from "@/components/agency-brain/BrainListCard";
import { BrainListToolbar } from "@/components/agency-brain/BrainListToolbar";
import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { parseAiAnalysisResponse } from "@/components/agency-brain/handleAiAnalysisResponse";
import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import type {
  ActionSuggestionDto,
  ActionSuggestionPriority,
  ActionSuggestionSource,
  ActionSuggestionStatus,
  ActionSuggestionSummary,
  ActionSuggestionType
} from "@/lib/action-suggestions/types";

const PAGE_SIZE = 10;

function statusVariant(status: ActionSuggestionStatus): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "PENDING":
      return "warning";
    case "EXECUTED":
      return "success";
    case "ACKNOWLEDGED":
      return "neutral";
    case "REJECTED":
      return "danger";
  }
}

function originLabel(
  item: ActionSuggestionDto,
  tClient: (key: string, values?: Record<string, string | number>) => string
): string {
  if (item.linkedHypothesisIds?.length) {
    return tClient("originHypothesis", { id: item.linkedHypothesisIds[0]!.slice(0, 8) });
  }
  const ruleId = item.evidence?.ruleId ?? "";
  if (ruleId.startsWith("signal_") || ruleId.startsWith("action_")) {
    const signal = ruleId.replace(/^(signal_|action_)/, "").toUpperCase();
    return tClient("originSignal", { signal });
  }
  return tClient(`source.${item.source}`);
}

function priorityVariant(priority: ActionSuggestionPriority): "neutral" | "success" | "warning" | "danger" {
  switch (priority) {
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "neutral";
  }
}

const ACTION_TYPES: ActionSuggestionType[] = [
  "scale_budget",
  "pause_campaign",
  "duplicate_audience",
  "refresh_creative",
  "review_campaign",
  "create_automation_rule"
];

export function SuggestionsContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");
  const tClient = useTranslations("clientSuggestions");
  const { aiDisabled, refresh: refreshAiStatus } = useAgencyBrainAi();

  const [items, setItems] = useState<ActionSuggestionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<ActionSuggestionSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<ActionSuggestionStatus | "">("PENDING");
  const [priorityFilter, setPriorityFilter] = useState<ActionSuggestionPriority | "">("");
  const [sourceFilter, setSourceFilter] = useState<ActionSuggestionSource | "">("");
  const [actionTypeFilter, setActionTypeFilter] = useState<ActionSuggestionType | "">("");
  const [sortBy, setSortBy] = useState<"createdAt" | "priority">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
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
        if (priorityFilter) params.set("priority", priorityFilter);
        if (sourceFilter) params.set("source", sourceFilter);
        if (actionTypeFilter) params.set("actionType", actionTypeFilter);
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));

        const listRes = await fetch(
          `/api/clients/${encodeURIComponent(clientId)}/action-suggestions?${params}`
        );
        const listJson = await listRes.json();

        if (listJson.ok) {
          setItems(listJson.items ?? []);
          setTotal(listJson.total ?? 0);
          setSummary(listJson.summary ?? null);
        } else {
          setMessage({ type: "err", text: listJson.error ?? tClient("errorLoad") });
        }
      } catch {
        setMessage({ type: "err", text: tClient("errorLoad") });
      } finally {
        setLoading(false);
        setListLoading(false);
      }
    },
    [
      clientId,
      statusFilter,
      priorityFilter,
      sourceFilter,
      actionTypeFilter,
      sortBy,
      sortDir,
      page,
      tClient
    ]
  );

  useEffect(() => {
    void load({ initial: true });
  }, [clientId]);

  useEffect(() => {
    if (!loading) void load();
  }, [statusFilter, priorityFilter, sourceFilter, actionTypeFilter, sortBy, sortDir, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, sourceFilter, actionTypeFilter, sortBy, sortDir]);

  async function handleGenerate() {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/action-suggestions/generate`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? tClient("errorGenerate") });
        return;
      }
      setMessage({ type: "ok", text: tClient("generateSuccess", { count: json.created ?? 0 }) });
      await load();
    } catch {
      setMessage({ type: "err", text: tClient("errorGenerate") });
    } finally {
      setGenerating(false);
    }
  }

  async function handleAiGenerate() {
    setAiGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/action-suggestions/ai-generate`,
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
        aiGenericError: t("aiErrorActions"),
        aiSuccess: (count) => t("aiSuccessActions", { count })
      });
      if (!parsed) return;
      setMessage(parsed.message);
      if (parsed.shouldReload) await load();
      if (parsed.shouldRefreshAiStatus) await refreshAiStatus();
    } catch {
      setMessage({ type: "err", text: t("aiErrorActions") });
    } finally {
      setAiGenerating(false);
    }
  }

  async function resolveAction(
    suggestionId: string,
    action: "execute" | "acknowledge" | "reject"
  ) {
    if (action === "reject" && !window.confirm(tClient("confirmReject"))) return;

    setActionLoadingId(suggestionId);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/action-suggestions/${suggestionId}/${action}`,
        { method: "PATCH", ...(action === "acknowledge" ? { body: JSON.stringify({}) } : {}) }
      );
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? tClient("errorAction") });
        return;
      }
      setMessage({
        type: "ok",
        text:
          action === "execute"
            ? json.meta?.applied
              ? tClient("executedMeta", { detail: json.meta.detail ?? "" })
              : json.meta?.error
                ? tClient("executedWithNote", { note: json.meta.error })
                : tClient("executed")
            : action === "acknowledge"
              ? tClient("acknowledged")
              : tClient("rejected")
      });
      await load();
    } catch {
      setMessage({ type: "err", text: tClient("errorAction") });
    } finally {
      setActionLoadingId(null);
    }
  }

  const summaryCards = summary
    ? [
        { key: "pending", value: summary.pending, label: tClient("cardPending") },
        { key: "executed", value: summary.executed, label: tClient("cardExecuted") },
        { key: "acknowledged", value: summary.acknowledged, label: tClient("cardAcknowledged") },
        { key: "rejected", value: summary.rejected, label: tClient("cardRejected") }
      ]
    : [];

  const linkedIds = (item: ActionSuggestionDto) => {
    const ids = new Set<string>();
    if (item.linkedLearningId) ids.add(item.linkedLearningId);
    for (const id of item.linkedLearningIds ?? []) ids.add(id);
    return Array.from(ids);
  };

  const sortOptions = [
    { value: "createdAt", label: t("sortBy.createdAt") },
    { value: "priority", label: t("sortBy.priority") }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="ui-btn-secondary text-sm"
          onClick={() => void handleGenerate()}
          disabled={generating || aiGenerating}
        >
          {generating ? tClient("generating") : tClient("generateSuggestions")}
        </button>
        <button
          type="button"
          className="ui-btn-primary text-sm"
          onClick={() => void handleAiGenerate()}
          disabled={generating || aiGenerating || aiDisabled}
          title={aiDisabled ? t("aiLimit") : undefined}
        >
          {aiGenerating ? t("generatingWithAi") : t("generateWithAi")}
        </button>
      </div>

      <FeedbackBanner message={message} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.key} className="ui-card p-4">
            <div className="text-2xl font-bold text-[var(--text-main)]">{card.value}</div>
            <div className="text-xs text-[var(--text-dim)]">{card.label}</div>
          </div>
        ))}
      </div>

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
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                className="ui-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ActionSuggestionStatus | "")}
              >
                <option value="">{tClient("filterAllStatus")}</option>
                {(["PENDING", "EXECUTED", "ACKNOWLEDGED", "REJECTED"] as ActionSuggestionStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {tClient(`status.${s}`)}
                    </option>
                  )
                )}
              </select>
              <select
                className="ui-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as ActionSuggestionPriority | "")}
              >
                <option value="">{t("filterAllPriority")}</option>
                {(["HIGH", "MEDIUM", "LOW"] as ActionSuggestionPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {t(`priority.${p}`)}
                  </option>
                ))}
              </select>
              <select
                className="ui-select"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as ActionSuggestionSource | "")}
              >
                <option value="">{t("filterAllSource")}</option>
                {(["RULE", "AI"] as ActionSuggestionSource[]).map((s) => (
                  <option key={s} value={s}>
                    {t(`source.${s}`)}
                  </option>
                ))}
              </select>
              <select
                className="ui-select"
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value as ActionSuggestionType | "")}
              >
                <option value="">{t("filterAllActionTypes")}</option>
                {ACTION_TYPES.map((at) => (
                  <option key={at} value={at}>
                    {tClient(`actionType.${at}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{tClient("loading")}</div>
      ) : items.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{tClient("empty")}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const busy = actionLoadingId === item.id;
            const manualUrl = item.actionPayload.manualUrl;
            const learningIds = linkedIds(item);

            const badges = (
              <>
                <Badge variant={statusVariant(item.status)}>
                  {tClient(`status.${item.status}`)}
                </Badge>
                <Badge variant={priorityVariant(item.priority)}>
                  {t(`priority.${item.priority}`)}
                </Badge>
                <Badge>{tClient(`actionType.${item.actionType}`)}</Badge>
                <Badge variant="neutral">{originLabel(item, tClient)}</Badge>
              </>
            );

            const actions = (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.status === "PENDING" ? (
                  <>
                    <button
                      type="button"
                      className="ui-btn-primary text-xs"
                      disabled={busy}
                      onClick={() => void resolveAction(item.id, "execute")}
                    >
                      {tClient("execute")}
                    </button>
                    <button
                      type="button"
                      className="ui-btn-secondary text-xs"
                      disabled={busy}
                      onClick={() => void resolveAction(item.id, "acknowledge")}
                    >
                      {tClient("thanks")}
                    </button>
                    <button
                      type="button"
                      className="ui-btn-danger text-xs"
                      disabled={busy}
                      onClick={() => void resolveAction(item.id, "reject")}
                    >
                      {tClient("reject")}
                    </button>
                    {manualUrl ? (
                      <Link href={manualUrl} className="ui-btn-secondary text-xs">
                        {tClient("doManually")}
                      </Link>
                    ) : null}
                  </>
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
                {item.evidence?.reason ? (
                  <p className="mt-2 text-xs text-[var(--text-dim)]">{item.evidence.reason}</p>
                ) : null}
                {item.linkedHypothesisIds?.length ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--text-dim)]">{tClient("linkedHypothesis")}:</span>
                    {item.linkedHypothesisIds.map((id) => (
                      <Link
                        key={id}
                        href={`/agency-brain/hypotheses?client=${encodeURIComponent(clientId)}`}
                        className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                      >
                        {id.slice(0, 8)}…
                      </Link>
                    ))}
                  </div>
                ) : null}
                {learningIds.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--text-dim)]">{t("linkedLearning")}:</span>
                    {learningIds.map((id) => (
                      <Link
                        key={id}
                        href={`/agency-brain/learnings?client=${encodeURIComponent(clientId)}`}
                        className="rounded-full bg-[rgba(124,58,237,0.06)] px-2 py-0.5 text-[11px] font-medium text-violet-700 hover:bg-[rgba(124,58,237,0.1)]"
                      >
                        {id.slice(0, 8)}…
                      </Link>
                    ))}
                  </div>
                ) : null}
                {item.actionPayload.checklist?.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[var(--text-dim)]">
                    {item.actionPayload.checklist.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
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
