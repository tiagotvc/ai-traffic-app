"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { Badge } from "@/components/ui/Badge";
import type { ExperimentDto } from "@/lib/agency-brain/domain/schemas";
import type { ForecastResult } from "@/lib/agency-brain/forecast-service";

type CampaignOption = { metaCampaignId: string; campaignName: string | null };

export function ExperimentsContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");

  const [items, setItems] = useState<ExperimentDto[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [form, setForm] = useState({
    title: "",
    variantA: "",
    variantB: "",
    metaCampaignId: "",
    horizonDays: 7
  });
  const [previewForecast, setPreviewForecast] = useState<ForecastResult | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, campRes] = await Promise.all([
        fetch(`/api/clients/${encodeURIComponent(clientId)}/experiments?pageSize=50`),
        fetch(`/api/clients/${encodeURIComponent(clientId)}/experiments/forecast`)
      ]);
      const json = await expRes.json();
      const campJson = await campRes.json();
      if (json.ok) {
        setItems(json.items ?? []);
      } else {
        setMessage({ type: "err", text: json.error ?? t("experimentsErrorLoad") });
      }
      if (campJson.ok) {
        setCampaigns(campJson.campaigns ?? []);
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

  useEffect(() => {
    if (!form.metaCampaignId) {
      setPreviewForecast(null);
      return;
    }
    setForecastLoading(true);
    fetch(
      `/api/clients/${encodeURIComponent(clientId)}/experiments/forecast?campaignId=${encodeURIComponent(form.metaCampaignId)}&horizon=${form.horizonDays}`
    )
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPreviewForecast(j.forecast ?? null);
      })
      .catch(() => setPreviewForecast(null))
      .finally(() => setForecastLoading(false));
  }, [clientId, form.metaCampaignId, form.horizonDays]);

  async function handleCreate() {
    if (!form.title.trim() || !form.variantA.trim() || !form.variantB.trim()) return;

    setSaving(true);
    setMessage(null);
    try {
      const variantA =
        previewForecast?.projection && previewForecast.quality === "ok"
          ? t("experimentsVariantABaseline", {
              spend: previewForecast.projection.spend.projected.toFixed(0),
              days: form.horizonDays
            })
          : form.variantA.trim();

      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/experiments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          variantA,
          variantB: form.variantB.trim(),
          metaCampaignId: form.metaCampaignId || null,
          horizonDays: form.metaCampaignId ? form.horizonDays : null,
          baselineForecast: previewForecast?.projection ?? null
        })
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("experimentsErrorCreate") });
        return;
      }
      setMessage({ type: "ok", text: t("experimentsCreateSuccess") });
      setForm({ title: "", variantA: "", variantB: "", metaCampaignId: "", horizonDays: 7 });
      setPreviewForecast(null);
      setShowForm(false);
      await load();
    } catch {
      setMessage({ type: "err", text: t("experimentsErrorCreate") });
    } finally {
      setSaving(false);
    }
  }

  function formatForecastBlock(forecast: ForecastResult | null | undefined) {
    if (!forecast?.projection || forecast.quality !== "ok") {
      return forecast?.quality === "insufficient_history"
        ? t("experimentsForecastInsufficient")
        : null;
    }
    const p = forecast.projection;
    return t("experimentsForecastSummary", {
      spend: p.spend.projected.toFixed(0),
      cpa: p.cpa.projected != null ? p.cpa.projected.toFixed(2) : "—",
      roas: p.roas.projected.toFixed(2),
      days: p.horizonDays
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{t("experimentsSubtitle")}</p>

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
          <select
            className="ui-input"
            value={form.metaCampaignId}
            onChange={(e) => setForm((f) => ({ ...f, metaCampaignId: e.target.value }))}
          >
            <option value="">{t("experimentsSelectCampaign")}</option>
            {campaigns.map((c) => (
              <option key={c.metaCampaignId} value={c.metaCampaignId}>
                {c.campaignName ?? c.metaCampaignId}
              </option>
            ))}
          </select>
          {form.metaCampaignId ? (
            <select
              className="ui-input"
              value={String(form.horizonDays)}
              onChange={(e) => setForm((f) => ({ ...f, horizonDays: Number(e.target.value) }))}
            >
              <option value="7">7 {t("experimentsDays")}</option>
              <option value="14">14 {t("experimentsDays")}</option>
              <option value="30">30 {t("experimentsDays")}</option>
            </select>
          ) : null}
          {forecastLoading ? (
            <p className="text-xs text-slate-400">{t("experimentsForecastLoading")}</p>
          ) : previewForecast ? (
            <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-xs text-violet-900">
              {formatForecastBlock(previewForecast)}
            </div>
          ) : null}
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
                {item.horizonDays ? (
                  <Badge variant="neutral">{t("experimentsHorizon", { days: item.horizonDays })}</Badge>
                ) : null}
                <span className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              {item.baselineForecast ? (
                <p className="mt-2 text-xs text-violet-700">
                  {t("experimentsHasForecast")}
                </p>
              ) : null}
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
