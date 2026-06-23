"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

import { WidgetLibraryThumbnail } from "@/components/dashboard/canvas/WidgetLibraryThumbnail";
import { PremiumPreviewFrame } from "@/components/dashboard/canvas/PremiumPreviewFrame";
import { cn } from "@/lib/cn";
import {
  AI_BUILDER_MIN_PROMPT_LENGTH,
  AI_BUILDER_SUGGESTION_KEYS,
  inferWidgetFromPrompt
} from "@/lib/dashboard/ai-widget-inference";
import type { LayoutDto } from "@/lib/dashboard/widget-catalog";

function mapApiError(message: string, t: ReturnType<typeof useTranslations>): string {
  const lower = message.toLowerCase();
  if (lower.includes("not available") || lower.includes("403")) return t("aiBuilderPlanError");
  if (lower.includes("layout not found")) return t("aiBuilderNoLayout");
  if (lower.includes("widget limit")) return t("aiBuilderLimitError");
  if (lower.includes("higher plan") || lower.includes("requires")) return t("aiBuilderWidgetPlanError");
  if (lower.includes("prompt") || lower.includes("too_small") || lower.includes("invalid prompt")) {
    return t("aiBuilderMinChars", { min: AI_BUILDER_MIN_PROMPT_LENGTH });
  }
  return message || t("aiBuilderError");
}

export function AiWidgetBuilderModal({
  open,
  layoutId,
  onClose,
  onCreated
}: {
  open: boolean;
  layoutId?: string;
  onClose: () => void;
  onCreated: (layout?: LayoutDto) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const trimmed = prompt.trim();
  const charCount = trimmed.length;
  const canSubmit = charCount >= AI_BUILDER_MIN_PROMPT_LENGTH && !!layoutId && !saving;

  const inferred = useMemo(() => {
    if (charCount < 3) return null;
    return inferWidgetFromPrompt(trimmed);
  }, [trimmed, charCount]);

  useEffect(() => {
    if (open) {
      setPrompt("");
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/dashboard/ai-widgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ layoutId, prompt: trimmed })
      });
      const j = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        layout?: LayoutDto;
      } | null;

      if (j?.ok) {
        setSuccess(true);
        window.setTimeout(() => {
          onCreated(j.layout);
          onClose();
        }, 450);
        return;
      }

      setError(mapApiError(j?.error ?? "", t));
    } catch {
      setError(t("aiBuilderError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          borderColor: "rgba(245,166,35,0.28)",
          background:
            "linear-gradient(165deg, rgba(124,58,237,0.1) 0%, var(--surface-card) 42%, var(--surface-card) 100%)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)"
        }}
      >
        <div
          className="shrink-0 border-b px-5 py-4"
          style={{
            borderColor: "rgba(245,166,35,0.12)",
            background: "linear-gradient(90deg, rgba(124,58,237,0.1), rgba(245,166,35,0.04))"
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(245,166,35,0.28), rgba(124,58,237,0.22))",
                boxShadow: "inset 0 0 0 1px rgba(245,166,35,0.28)"
              }}
            >
              <Wand2 size={18} style={{ color: "#fde68a" }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-semibold" style={{ color: "var(--text-main)" }}>
                {t("aiBuilderTitle")}
              </h2>
              <p className="mt-0.5 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                {t("aiBuilderHint")}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-violet-200/70">
              {t("aiBuilderPromptLabel")}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              rows={4}
              placeholder={t("aiBuilderPlaceholder")}
              className="w-full resize-none rounded-xl border px-3.5 py-3 text-sm leading-relaxed outline-none transition focus:ring-2"
              style={{
                borderColor: "rgba(124,58,237,0.22)",
                background: "rgba(10,15,20,0.35)",
                color: "var(--text-main)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)"
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
              <span style={{ color: charCount >= AI_BUILDER_MIN_PROMPT_LENGTH ? "#34d399" : "var(--text-dimmer)" }}>
                {t("aiBuilderCharCount", { count: charCount, min: AI_BUILDER_MIN_PROMPT_LENGTH })}
              </span>
              {!layoutId ? (
                <span style={{ color: "#f87171" }}>{t("aiBuilderNoLayout")}</span>
              ) : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-violet-200/55">
              {t("aiBuilderSuggestionsTitle")}
            </p>
            <div className="flex flex-wrap gap-2">
              {AI_BUILDER_SUGGESTION_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setPrompt(t(key));
                    setError(null);
                  }}
                  className="rounded-full border px-3 py-1.5 text-left text-[11px] font-medium transition hover:brightness-110"
                  style={{
                    borderColor: "rgba(245,166,35,0.28)",
                    background: "linear-gradient(135deg, rgba(245,166,35,0.14), rgba(124,58,237,0.12))",
                    color: "var(--text-main)"
                  }}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border p-3"
            style={{
              borderColor: "rgba(124,58,237,0.16)",
              background: "linear-gradient(165deg, rgba(124,58,237,0.05) 0%, transparent 100%)"
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={13} style={{ color: "#fbbf24" }} />
              <p className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>
                {t("aiBuilderPreviewLabel")}
              </p>
            </div>

            {inferred ? (
              <div className="flex gap-3">
                <div className="h-[88px] w-[140px] shrink-0">
                  <WidgetLibraryThumbnail
                    widgetType={inferred.widgetType}
                    config={inferred.config}
                    isPremium={inferred.widgetType.startsWith("premium.") || inferred.widgetType.startsWith("ai.")}
                  />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                    {t(inferred.titleKey)}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
                    {t("aiBuilderPreviewHint")}
                  </p>
                  <span
                    className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={{
                      background:
                        inferred.confidence === "high"
                          ? "rgba(52,211,153,0.15)"
                          : inferred.confidence === "medium"
                            ? "rgba(245,166,35,0.15)"
                            : "rgba(148,163,184,0.12)",
                      color:
                        inferred.confidence === "high"
                          ? "#34d399"
                          : inferred.confidence === "medium"
                            ? "#fbbf24"
                            : "var(--text-dimmer)"
                    }}
                  >
                    {t(`aiBuilderConfidence_${inferred.confidence}`)}
                  </span>
                </div>
              </div>
            ) : (
              <PremiumPreviewFrame className="flex h-[88px] items-center justify-center px-4" accent="violet">
                <p className="text-center text-[11px] leading-relaxed" style={{ color: "var(--text-dimmer)" }}>
                  {t("aiBuilderPreviewEmpty")}
                </p>
              </PremiumPreviewFrame>
            )}
          </div>

          {error ? (
            <div
              className="rounded-xl border px-3 py-2 text-xs"
              style={{ borderColor: "rgba(239,68,68,0.28)", background: "rgba(239,68,68,0.08)", color: "#fca5a5" }}
            >
              {error}
            </div>
          ) : null}

          {success ? (
            <div
              className="rounded-xl border px-3 py-2 text-xs font-medium"
              style={{ borderColor: "rgba(52,211,153,0.28)", background: "rgba(52,211,153,0.08)", color: "#6ee7b7" }}
            >
              {t("aiBuilderSuccess")}
            </div>
          ) : null}
        </div>

        <div
          className="flex shrink-0 justify-end gap-2 border-t px-5 py-3.5"
          style={{ borderColor: "rgba(245,166,35,0.12)" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
          >
            {t("close")}
          </button>
          <button
            type="button"
            disabled={!canSubmit || success}
            onClick={() => void submit()}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
              "hover:brightness-110 active:scale-[0.98]"
            )}
            style={{
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              color: "#0f1419",
              boxShadow: "0 8px 24px rgba(245,166,35,0.22)"
            }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {saving ? t("aiBuilderSaving") : t("aiBuilderCreate")}
          </button>
        </div>
      </div>
    </div>
  );
}
