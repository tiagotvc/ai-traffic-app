"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import type {
  ActionSuggestionDto,
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

export function SuggestionsContent({ clientId }: { clientId: string }) {
  const t = useTranslations("clientSuggestions");

  const [items, setItems] = useState<ActionSuggestionDto[]>([]);
  const [summary, setSummary] = useState<ActionSuggestionSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<ActionSuggestionStatus | "">("PENDING");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
        setMessage({ type: "err", text: listJson.error ?? t("errorLoad") });
      }
    } catch {
      setMessage({ type: "err", text: t("errorLoad") });
    } finally {
      setLoading(false);
    }
  }, [clientId, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

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
        setMessage({ type: "err", text: json.error ?? t("errorGenerate") });
        return;
      }
      setMessage({ type: "ok", text: t("generateSuccess", { count: json.created ?? 0 }) });
      await load();
    } catch {
      setMessage({ type: "err", text: t("errorGenerate") });
    } finally {
      setGenerating(false);
    }
  }

  async function resolveAction(
    suggestionId: string,
    action: "execute" | "acknowledge" | "reject"
  ) {
    if (action === "reject" && !window.confirm(t("confirmReject"))) return;

    setActionLoadingId(suggestionId);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/action-suggestions/${suggestionId}/${action}`,
        { method: "PATCH", ...(action === "acknowledge" ? { body: JSON.stringify({}) } : {}) }
      );
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("errorAction") });
        return;
      }
      setMessage({
        type: "ok",
        text:
          action === "execute"
            ? t("executed")
            : action === "acknowledge"
              ? t("acknowledged")
              : t("rejected")
      });
      await load();
    } catch {
      setMessage({ type: "err", text: t("errorAction") });
    } finally {
      setActionLoadingId(null);
    }
  }

  const summaryCards = summary
    ? [
        { key: "pending", value: summary.pending, label: t("cardPending") },
        { key: "executed", value: summary.executed, label: t("cardExecuted") },
        { key: "acknowledged", value: summary.acknowledged, label: t("cardAcknowledged") },
        { key: "rejected", value: summary.rejected, label: t("cardRejected") }
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="ui-btn-primary text-sm"
          onClick={() => void handleGenerate()}
          disabled={generating}
        >
          {generating ? t("generating") : t("generateSuggestions")}
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

      <div className="ui-card p-4">
        <select
          className="ui-select max-w-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ActionSuggestionStatus | "")}
        >
          <option value="">{t("filterAllStatus")}</option>
          {(["PENDING", "EXECUTED", "ACKNOWLEDGED", "REJECTED"] as ActionSuggestionStatus[]).map(
            (s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            )
          )}
        </select>
      </div>

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
      ) : items.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("empty")}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const busy = actionLoadingId === item.id;
            const manualUrl = item.actionPayload.manualUrl;
            return (
              <div key={item.id} className="ui-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <Badge variant={statusVariant(item.status)}>{t(`status.${item.status}`)}</Badge>
                      <Badge>{t(`actionType.${item.actionType}`)}</Badge>
                      <Badge>{t(`source.${item.source}`)}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    {item.evidence?.reason ? (
                      <p className="mt-2 text-xs text-slate-500">{item.evidence.reason}</p>
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
                          {t("execute")}
                        </button>
                        <button
                          type="button"
                          className="ui-btn-secondary text-xs"
                          disabled={busy}
                          onClick={() => void resolveAction(item.id, "acknowledge")}
                        >
                          {t("thanks")}
                        </button>
                        <button
                          type="button"
                          className="ui-btn-danger text-xs"
                          disabled={busy}
                          onClick={() => void resolveAction(item.id, "reject")}
                        >
                          {t("reject")}
                        </button>
                        {manualUrl ? (
                          <Link href={manualUrl} className="ui-btn-secondary text-xs">
                            {t("doManually")}
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
