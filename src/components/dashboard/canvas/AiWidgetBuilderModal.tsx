"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function AiWidgetBuilderModal({
  open,
  layoutId,
  onClose,
  onCreated
}: {
  open: boolean;
  layoutId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPrompt("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!layoutId || !prompt.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/ai-widgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ layoutId, prompt: prompt.trim() })
      });
      const j = await res.json();
      if (j.ok) {
        onCreated();
        onClose();
      } else {
        setError(j.error ?? t("aiBuilderError"));
      }
    } catch {
      setError(t("aiBuilderError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-2xl border p-5 shadow-xl"
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <h2 className="font-heading text-lg font-semibold" style={{ color: "var(--text-main)" }}>
          {t("aiBuilderTitle")}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
          {t("aiBuilderHint")}
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder={t("aiBuilderPlaceholder")}
          className="mt-4 w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)", color: "var(--text-main)" }}
        />
        {error ? (
          <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
          >
            {t("close")}
          </button>
          <button
            type="button"
            disabled={saving || !prompt.trim()}
            onClick={() => void submit()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "#7c3aed" }}
          >
            {saving ? t("aiBuilderSaving") : t("aiBuilderCreate")}
          </button>
        </div>
      </div>
    </div>
  );
}
