"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import type { FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { FeedbackBanner } from "@/components/agency-brain/FeedbackBanner";

type CompetitorRow = {
  name: string;
  pageId: string;
  pageUrl: string;
};

const EMPTY_ROW = (): CompetitorRow => ({ name: "", pageId: "", pageUrl: "" });

export function ClientMarketContextPanel({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");
  const [marketCountry, setMarketCountry] = useState("BR");
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([EMPTY_ROW()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/context`);
      const json = await res.json();
      if (json.ok) {
        setMarketCountry(json.marketCountry ?? "BR");
        const list = Array.isArray(json.competitors) ? json.competitors : [];
        setCompetitors(
          list.length
            ? list.map((c: { name?: string; pageId?: string; pageUrl?: string }) => ({
                name: c.name ?? "",
                pageId: c.pageId ?? "",
                pageUrl: c.pageUrl ?? ""
              }))
            : [EMPTY_ROW()]
        );
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        marketCountry: marketCountry.trim() || "BR",
        competitors: competitors
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            pageId: c.pageId.trim() || undefined,
            pageUrl: c.pageUrl.trim() || undefined
          }))
      };

      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/context`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("marketContextSaveError") });
        return;
      }
      setMessage({ type: "ok", text: t("marketContextSaveSuccess") });
      await load();
    } catch {
      setMessage({ type: "err", text: t("marketContextSaveError") });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="ui-card p-4 text-sm text-[var(--text-dim)]">{t("loading")}</div>
    );
  }

  return (
    <div className="ui-card space-y-4 p-4">
      <div>
        <h3 className="font-heading font-semibold text-[var(--text-main)]">{t("marketContextTitle")}</h3>
        <p className="mt-1 text-xs text-[var(--text-dim)]">{t("marketContextHint")}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-dim)]">
          {t("marketContextCountry")}
        </label>
        <select
          className="ui-select max-w-xs"
          value={marketCountry}
          onChange={(e) => setMarketCountry(e.target.value)}
        >
          <option value="BR">Brasil (BR)</option>
          <option value="EU">Europa (EU)</option>
          <option value="UK">Reino Unido (UK)</option>
          <option value="US">Estados Unidos (US)</option>
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--text-dim)]">{t("marketContextCompetitors")}</p>
        {competitors.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-thead)] p-2 sm:grid-cols-3">
            <input
              className="ui-input text-xs"
              placeholder={t("marketContextCompetitorName")}
              value={row.name}
              onChange={(e) => {
                const next = [...competitors];
                next[index] = { ...next[index], name: e.target.value };
                setCompetitors(next);
              }}
            />
            <input
              className="ui-input text-xs"
              placeholder={t("marketContextPageId")}
              value={row.pageId}
              onChange={(e) => {
                const next = [...competitors];
                next[index] = { ...next[index], pageId: e.target.value };
                setCompetitors(next);
              }}
            />
            <input
              className="ui-input text-xs"
              placeholder={t("marketContextPageUrl")}
              value={row.pageUrl}
              onChange={(e) => {
                const next = [...competitors];
                next[index] = { ...next[index], pageUrl: e.target.value };
                setCompetitors(next);
              }}
            />
          </div>
        ))}
        <button
          type="button"
          className="text-xs ui-link font-medium"
          onClick={() => setCompetitors([...competitors, EMPTY_ROW()])}
        >
          {t("marketContextAddCompetitor")}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="ui-btn-primary text-xs"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? t("updating") : t("marketContextSave")}
        </button>
      </div>

      <FeedbackBanner message={message} />
    </div>
  );
}
