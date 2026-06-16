"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { Badge } from "@/components/ui/Badge";
import type { ExperimentDto } from "@/lib/agency-brain/domain/schemas";

export function ExperimentsContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");

  const [items, setItems] = useState<ExperimentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [form, setForm] = useState({ title: "", variantA: "", variantB: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/experiments?pageSize=50`
      );
      const json = await res.json();
      if (json.ok) {
        setItems(json.items ?? []);
      } else {
        setMessage({ type: "err", text: json.error ?? t("experimentsErrorLoad") });
      }
    } catch {
      setMessage({ type: "err", text: t("experimentsErrorLoad") });
    } finally {
      setLoading(false);
    }
  }, [clientId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!form.title.trim() || !form.variantA.trim() || !form.variantB.trim()) return;

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/experiments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          variantA: form.variantA.trim(),
          variantB: form.variantB.trim()
        })
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("experimentsErrorCreate") });
        return;
      }
      setMessage({ type: "ok", text: t("experimentsCreateSuccess") });
      setForm({ title: "", variantA: "", variantB: "" });
      setShowForm(false);
      await load();
    } catch {
      setMessage({ type: "err", text: t("experimentsErrorCreate") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="ui-btn-primary text-sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? t("cancel") : t("experimentsNew")}
        </button>
      </div>

      <FeedbackBanner message={message} />

      {showForm ? (
        <div className="ui-card space-y-3 p-4">
          <h3 className="font-semibold text-slate-900">{t("experimentsNew")}</h3>
          <input
            className="ui-input"
            placeholder={t("experimentsFieldTitle")}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <input
            className="ui-input"
            placeholder={t("experimentsFieldVariantA")}
            value={form.variantA}
            onChange={(e) => setForm((f) => ({ ...f, variantA: e.target.value }))}
          />
          <input
            className="ui-input"
            placeholder={t("experimentsFieldVariantB")}
            value={form.variantB}
            onChange={(e) => setForm((f) => ({ ...f, variantB: e.target.value }))}
          />
          <button
            type="button"
            className="ui-btn-primary text-sm"
            onClick={() => void handleCreate()}
            disabled={saving}
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
      ) : items.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("experimentsEmpty")}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="ui-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                {item.winner ? (
                  <Badge variant="success">{t("experimentsWinner", { winner: item.winner })}</Badge>
                ) : (
                  <Badge variant="warning">{t("experimentsRunning")}</Badge>
                )}
                <span className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500">{t("experimentsVariantA")}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.variantA}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-medium text-slate-500">{t("experimentsVariantB")}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.variantB}</p>
                </div>
              </div>
              {item.conclusion ? (
                <p className="mt-3 text-sm text-slate-600">{item.conclusion}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
