"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { formatBRL } from "@/lib/format";

export function BudgetEditDrawer({
  open,
  metaCampaignId,
  campaignName,
  currentBudget,
  locale,
  onClose,
  onSaved
}: {
  open: boolean;
  metaCampaignId: string;
  campaignName: string;
  currentBudget: number | null;
  locale: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("campaignManager");
  const tCommon = useTranslations("common");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setValue(currentBudget != null && currentBudget > 0 ? String(currentBudget) : "");
    setMessage(null);
    setIsError(false);
  }, [open, currentBudget, metaCampaignId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const save = () => {
    const amount = Number(value.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return;
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      const res = await fetch(`/api/campaigns/${encodeURIComponent(metaCampaignId)}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update_budget", dailyBudgetBrl: amount })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setIsError(true);
        setMessage(String(j.error ?? t("budgetDrawerFailed")));
        return;
      }
      onSaved();
      onClose();
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={tCommon("close")}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-violet-600">{campaignName}</p>
            <h2 className="text-lg font-bold text-slate-900">{t("budgetDrawerTitle")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <div className="text-xs text-slate-500">{t("budgetDrawerCurrent")}</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {currentBudget != null ? formatBRL(currentBudget, locale) : "—"}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("budgetDrawerNew")}</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="ui-input mt-1 w-full"
            />
          </div>
          {message ? (
            <p className={`text-sm ${isError ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>
          ) : null}
        </div>
        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="ui-btn-secondary flex-1">
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              disabled={isPending || !value.trim()}
              onClick={save}
              className="ui-btn-primary flex-1 disabled:opacity-60"
            >
              {isPending ? tCommon("sending") : t("budgetDrawerSave")}
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
