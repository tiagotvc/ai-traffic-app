"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import type {
  ActionSuggestionDto,
  ActionSuggestionPriority,
  ActionSuggestionStatus,
  ActionSuggestionSummary
} from "@/lib/action-suggestions/types";

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

const PRIORITY_FILTERS: Array<ActionSuggestionPriority | ""> = ["", "HIGH", "MEDIUM", "LOW"];

export function SuggestionsContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");
  const tClient = useTranslations("clientSuggestions");
  const { aiDisabled, refresh: refreshAiStatus } = useAgencyBrainAi();

  const [items, setItems] = useState<ActionSuggestionDto[]>([]);
  const [summary, setSummary] = useState<ActionSuggestionSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<ActionSuggestionStatus | "">("PENDING");
  const [priorityFilter, setPriorityFilter] = useState<ActionSuggestionPriority | "">("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("pageSize", "50");

      const listRes = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/action-suggestions?${params}`
      );
      const listJson = await listRes.json();

      if (listJson.ok) {
        setItems(listJson.items ?? []);
        setSummary(listJson.summary ?? null);
      } else {
        setMessage({ type: "err", text: listJson.error ?? tClient("errorLoad") });
      }
    } catch {
      setMessage({ type: "err", text: tClient("errorLoad") });
    } finally {
      setLoading(false);
    }
  }, [clientId, statusFilter, tClient]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!priorityFilter) return items;
    return items.filter((item) => item.priority === priorityFilter);
  }, [items, priorityFilter]);

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
      if (res.status === 402 || json.code === "PLAN_LIMIT") {
        setMessage({ type: "err", text: t("aiLimit") });
        return;
      }
      if (json.code === "NO_AI_KEY") {
        setMessage({ type: "err", text: t("aiNoKey") });
        return;
      }
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("aiErrorActions") });
        return;
      }
      setMessage({ type: "ok", text: t("aiSuccessActions", { count: json.created ?? 0 }) });
      await Promise.all([load(), refreshAiStatus()]);
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
            ? tClient("executed")
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
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <div className="text-xs text-slate-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="ui-card space-y-3 p-4">
        <select
          className="ui-select max-w-xs"
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

        <div className="flex flex-wrap gap-2">
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p || "all"}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                priorityFilter === p
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => setPriorityFilter(p)}
            >
              {p ? t(`priority.${p}`) : t("filterAllPriority")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{tClient("loading")}</div>
      ) : filteredItems.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{tClient("empty")}</div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const busy = actionLoadingId === item.id;
            const manualUrl = item.actionPayload.manualUrl;
            const learningIds = linkedIds(item);
            return (
              <div key={item.id} className="ui-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <Badge variant={statusVariant(item.status)}>
                        {tClient(`status.${item.status}`)}
                      </Badge>
                      <Badge variant={priorityVariant(item.priority)}>
                        {t(`priority.${item.priority}`)}
                      </Badge>
                      <Badge>{tClient(`actionType.${item.actionType}`)}</Badge>
                      <Badge>{tClient(`source.${item.source}`)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    {item.evidence?.reason ? (
                      <p className="mt-2 text-xs text-slate-500">{item.evidence.reason}</p>
                    ) : null}
                    {learningIds.length > 0 ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">{t("linkedLearning")}:</span>
                        {learningIds.map((id) => (
                          <Link
                            key={id}
                            href={`/agency-brain/learnings?client=${encodeURIComponent(clientId)}`}
                            className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100"
                          >
                            {id.slice(0, 8)}…
                          </Link>
                        ))}
                      </div>
                    ) : null}
                    {item.actionPayload.checklist?.length ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                        {item.actionPayload.checklist.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
