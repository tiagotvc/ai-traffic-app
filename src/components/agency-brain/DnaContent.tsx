"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import type { ClientDnaPayload, DnaBucket } from "@/lib/agency-brain/domain/schemas";

const DNA_KEYS: Array<{ key: keyof ClientDnaPayload; labelKey: string }> = [
  { key: "audiences", labelKey: "dnaAudiences" },
  { key: "creatives", labelKey: "dnaCreatives" },
  { key: "placements", labelKey: "dnaPlacements" },
  { key: "offers", labelKey: "dnaOffers" },
  { key: "copy", labelKey: "dnaCopy" },
  { key: "seasonality", labelKey: "dnaSeasonality" }
];

function BucketSection({
  title,
  bucket,
  worksLabel,
  doesntWorkLabel
}: {
  title: string;
  bucket: DnaBucket;
  worksLabel: string;
  doesntWorkLabel: string;
}) {
  return (
    <div className="ui-card p-4">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-green-700">{worksLabel}</p>
          {bucket.works.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-600">
              {bucket.works.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-400">—</p>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-red-700">{doesntWorkLabel}</p>
          {bucket.doesntWork.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-600">
              {bucket.doesntWork.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-400">—</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function DnaContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");

  const [dna, setDna] = useState<ClientDnaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [overrideText, setOverrideText] = useState("");
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [nichePatterns, setNichePatterns] = useState<string[]>([]);
  const [nicheAggregated, setNicheAggregated] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dnaRes, nicheRes] = await Promise.all([
        fetch(`/api/clients/${encodeURIComponent(clientId)}/dna`),
        fetch(`/api/agency-brain/niche-insights?client=${encodeURIComponent(clientId)}`)
      ]);
      const json = await dnaRes.json();
      const nicheJson = await nicheRes.json();
      if (json.ok) {
        setDna(json.dna);
        setOverrideText(JSON.stringify(json.dna?.manualOverrides ?? {}, null, 2));
      } else {
        setMessage({ type: "err", text: json.error ?? t("dnaErrorLoad") });
      }
      if (nicheJson.ok && Array.isArray(nicheJson.patterns)) {
        setNichePatterns(nicheJson.patterns);
        setNicheAggregated(!!nicheJson.aggregated);
      } else {
        setNichePatterns([]);
        setNicheAggregated(false);
      }
    } catch {
      setMessage({ type: "err", text: t("dnaErrorLoad") });
    } finally {
      setLoading(false);
    }
  }, [clientId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRebuild() {
    setRebuilding(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/dna/rebuild`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("dnaErrorRebuild") });
        return;
      }
      setDna(json.dna);
      setOverrideText(JSON.stringify(json.dna?.manualOverrides ?? {}, null, 2));
      setMessage({ type: "ok", text: t("dnaRebuildSuccess") });
    } catch {
      setMessage({ type: "err", text: t("dnaErrorRebuild") });
    } finally {
      setRebuilding(false);
    }
  }

  async function handleSaveOverrides() {
    setSaving(true);
    setMessage(null);
    try {
      let manualOverrides: Record<string, unknown> = {};
      try {
        manualOverrides = JSON.parse(overrideText || "{}") as Record<string, unknown>;
      } catch {
        setMessage({ type: "err", text: t("dnaErrorOverridesJson") });
        return;
      }

      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/dna`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualOverrides })
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("dnaErrorSave") });
        return;
      }
      setDna(json.dna);
      setEditMode(false);
      setMessage({ type: "ok", text: t("dnaSaveSuccess") });
    } catch {
      setMessage({ type: "err", text: t("dnaErrorSave") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="ui-btn-secondary text-sm"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? t("dnaCancelEdit") : t("dnaEditOverrides")}
        </button>
        <button
          type="button"
          className="ui-btn-primary text-sm"
          onClick={() => void handleRebuild()}
          disabled={rebuilding}
        >
          {rebuilding ? t("dnaRebuilding") : t("dnaRebuild")}
        </button>
      </div>

      <FeedbackBanner message={message} />

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
      ) : !dna ? (
        <div className="space-y-4">
          <div className="ui-card p-8 text-center text-sm text-slate-500">{t("dnaEmpty")}</div>
          {nichePatterns.length > 0 ? (
            <div className="ui-card p-4">
              <h3 className="font-semibold text-slate-900">{t("nicheInsightsTitle")}</h3>
              <p className="mt-1 text-xs text-slate-500">{t("nicheInsightsHint")}</p>
              {nicheAggregated ? (
                <p className="mt-1 text-xs text-violet-600">{t("nicheInsightsAggregated")}</p>
              ) : null}
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-600">
                {nichePatterns.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="ui-card p-4">
            <h3 className="font-semibold text-slate-900">{t("dnaSummary")}</h3>
            <p className="mt-2 text-sm text-slate-600">{dna.summaryText || t("dnaNoSummary")}</p>
            {dna.lastDerivedAt ? (
              <p className="mt-2 text-xs text-slate-400">
                {t("dnaLastDerived", {
                  date: new Date(dna.lastDerivedAt).toLocaleDateString()
                })}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">
              {t("dnaApprovedCount", { count: dna.approvedLearningCount })}
            </p>
          </div>

          {DNA_KEYS.map(({ key, labelKey }) => {
            const bucket = dna[key] as DnaBucket;
            if (!bucket) return null;
            return (
              <BucketSection
                key={key}
                title={t(labelKey)}
                bucket={bucket}
                worksLabel={t("dnaWorks")}
                doesntWorkLabel={t("dnaDoesntWork")}
              />
            );
          })}

          {editMode ? (
            <div className="ui-card p-4 space-y-3">
              <h3 className="font-semibold text-slate-900">{t("dnaOverridesTitle")}</h3>
              <textarea
                className="ui-input min-h-[120px] font-mono text-xs"
                value={overrideText}
                onChange={(e) => setOverrideText(e.target.value)}
              />
              <button
                type="button"
                className="ui-btn-primary text-sm"
                onClick={() => void handleSaveOverrides()}
                disabled={saving}
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
