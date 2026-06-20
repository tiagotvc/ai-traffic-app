"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
  RANKABLE_METRICS,
  RANKABLE_PRESETS,
  type RankConfig
} from "@/lib/creative-ranking";
import { METRIC_BY_KEY } from "@/lib/dashboard-metrics";

export function RankingConfigModal({
  onClose,
  onSaved
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("creativesPerf");
  const tMetrics = useTranslations("metrics");
  const tPresets = useTranslations("campaignPresets");
  const [config, setConfig] = useState<RankConfig | null>(null);
  const [defaults, setDefaults] = useState<RankConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/creatives/ranking-config")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setConfig(j.config);
          setDefaults(j.defaults);
        }
      })
      .catch(() => {});
  }, []);

  function setSpec(preset: string, patch: { metric?: string; dir?: "asc" | "desc" }) {
    setConfig((c) =>
      c
        ? {
            ...c,
            specs: {
              ...c.specs,
              [preset]: { ...c.specs[preset], ...patch } as RankConfig["specs"][string]
            }
          }
        : c
    );
  }

  function save() {
    if (!config) return;
    setSaving(true);
    fetch("/api/creatives/ranking-config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config)
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          onSaved();
          onClose();
        }
      })
      .finally(() => setSaving(false));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border-color)] px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("cfgTitle")}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)]"
              aria-label="close"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--text-dim)]">{t("cfgSubtitle")}</p>
        </div>

        {!config ? (
          <div className="p-8 text-center text-sm text-[var(--text-dim)]">…</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <label className="block">
                <span className="text-xs font-medium text-[var(--text-dim)]">{t("cfgMinImpr")}</span>
                <input
                  type="number"
                  min={0}
                  value={config.minImpressions}
                  onChange={(e) =>
                    setConfig((c) =>
                      c ? { ...c, minImpressions: Math.max(0, Number(e.target.value) || 0) } : c
                    )
                  }
                  className="ui-input mt-1 w-32"
                />
              </label>

              <div className="mt-4 space-y-2">
                {RANKABLE_PRESETS.map((preset) => {
                  const spec = config.specs[preset];
                  return (
                    <div
                      key={preset}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-color)] p-2.5"
                    >
                      <span className="min-w-[110px] text-sm font-medium text-[var(--text-dim)]">
                        {tPresets(preset)}
                      </span>
                      <select
                        value={spec.metric}
                        onChange={(e) => setSpec(preset, { metric: e.target.value })}
                        className="ui-select !w-auto !py-1.5 text-sm"
                      >
                        {RANKABLE_METRICS.map((m) => (
                          <option key={m} value={m}>
                            {tMetrics(METRIC_BY_KEY[m].label)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={spec.dir}
                        onChange={(e) => setSpec(preset, { dir: e.target.value as "asc" | "desc" })}
                        className="ui-select !w-auto !py-1.5 text-sm"
                      >
                        <option value="desc">{t("dirHigher")}</option>
                        <option value="asc">{t("dirLower")}</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[var(--border-color)] px-5 py-3">
              <button
                type="button"
                onClick={() => defaults && setConfig(defaults)}
                className="text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text-dim)]"
              >
                {t("cfgReset")}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="ui-btn-secondary text-sm">
                  {t("cfgCancel")}
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="ui-btn-primary text-sm disabled:opacity-60"
                >
                  {t("cfgSave")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
