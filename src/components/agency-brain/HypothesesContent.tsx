"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";
import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { Badge } from "@/components/ui/Badge";
import { formatConfidenceBadge } from "@/lib/agency-brain/confidence-score";
import type { HypothesisDto } from "@/lib/agency-brain/domain/schemas";

function confidenceScoreClass(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 50) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
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
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/hypotheses?pageSize=50`
      );
      const json = await res.json();
      if (json.ok) {
        setItems(json.items ?? []);
      } else {
        setMessage({ type: "err", text: json.error ?? t("hypothesesErrorLoad") });
      }
    } catch {
      setMessage({ type: "err", text: t("hypothesesErrorLoad") });
    } finally {
      setLoading(false);
    }
  }, [clientId, t]);

  useEffect(() => {
    void load();
  }, [load]);

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
      if (res.status === 402 || json.code === "PLAN_LIMIT") {
        setMessage({ type: "err", text: t("aiLimit") });
        return;
      }
      if (json.code === "NO_AI_KEY") {
        setMessage({ type: "err", text: t("aiNoKey") });
        return;
      }
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("hypothesesErrorAi") });
        return;
      }
      setMessage({ type: "ok", text: t("hypothesesAiSuccess", { count: json.created ?? 0 }) });
      await Promise.all([load(), refreshAiStatus()]);
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

  return (
    <div className="space-y-4">
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

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
      ) : items.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("hypothesesEmpty")}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const busy = actionLoadingId === item.id;
            const canAct =
              item.status === "SUGGESTED" || item.status === "TESTING" || item.status === "CONFIRMED";
            return (
              <div key={item.id} className="ui-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
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
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    {item.promotedLearningId ? (
                      <p className="mt-2 text-xs text-slate-500">
                        {t("hypothesesPromotedLearning", { id: item.promotedLearningId.slice(0, 8) })}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
