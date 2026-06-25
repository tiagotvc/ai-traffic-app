"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { DsButton, DsModal } from "@/design-system";
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
    <DsModal
      open
      onClose={onClose}
      title={t("cfgTitle")}
      subtitle={t("cfgSubtitle")}
      width="lg"
      footer={
        config ? (
          <div className="flex w-full items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => defaults && setConfig(defaults)}
              className="text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text-main)]"
            >
              {t("cfgReset")}
            </button>
            <div className="flex gap-2">
              <DsButton variant="secondary" size="sm" onClick={onClose}>
                {t("cfgCancel")}
              </DsButton>
              <DsButton variant="primary" size="sm" onClick={save} disabled={saving}>
                {t("cfgSave")}
              </DsButton>
            </div>
          </div>
        ) : undefined
      }
    >
        {!config ? (
          <div className="p-8 text-center text-sm text-[var(--text-dim)]">…</div>
        ) : (
          <>
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
          </>
        )}
    </DsModal>
  );
}
