"use client";

import { SlidersHorizontal, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import { DsButton } from "@/design-system";
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

  const metricOptions = RANKABLE_METRICS.map((m) => ({
    value: m,
    label: tMetrics(METRIC_BY_KEY[m].label)
  }));

  const directionOptions = [
    { value: "desc", label: t("dirHigher") },
    { value: "asc", label: t("dirLower") }
  ];

  return (
    <CreatorModalShell
      open
      onClose={onClose}
      title={t("cfgTitle")}
      subtitle={t("cfgSubtitle")}
      titleIcon={<SlidersHorizontal size={18} aria-hidden />}
      width="lg"
      hideFooter
    >
      {!config ? (
        <div className="py-8 text-center text-sm text-[var(--text-dim)]">…</div>
      ) : (
        <>
          <FilterTextField
            creatorField
            icon={<SlidersHorizontal size={14} />}
            label={t("cfgMinImpr")}
            value={String(config.minImpressions)}
            onChange={(v) =>
              setConfig((c) =>
                c ? { ...c, minImpressions: Math.max(0, Number(v) || 0) } : c
              )
            }
            placeholder="100"
          />

          <div className="mt-4 space-y-2">
            <h3 className="campaign-creator-orion-section-label">{t("cfgMetric")}</h3>
            {RANKABLE_PRESETS.map((preset) => {
              const spec = config.specs[preset];
              return (
                <div
                  key={preset}
                  className="campaign-creator-sidebar-card-inset flex flex-wrap items-center gap-2 px-3 py-2.5"
                >
                  <span className="min-w-[96px] shrink-0 text-xs font-semibold text-[var(--text-main)]">
                    {tPresets(preset)}
                  </span>
                  <FilterSelectDropdown
                    creatorField
                    icon={<TrendingUp size={14} />}
                    label={t("cfgMetric")}
                    placeholder={t("cfgMetric")}
                    clearable={false}
                    value={spec.metric}
                    onChange={(v) => setSpec(preset, { metric: v })}
                    options={metricOptions}
                    className="min-w-[140px] flex-1"
                  />
                  <FilterSelectDropdown
                    creatorField
                    icon={<TrendingDown size={14} />}
                    label={t("cfgDirection")}
                    placeholder={t("cfgDirection")}
                    clearable={false}
                    value={spec.dir}
                    onChange={(v) => setSpec(preset, { dir: v as "asc" | "desc" })}
                    options={directionOptions}
                    className="min-w-[140px] flex-1"
                  />
                </div>
              );
            })}
          </div>

          <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] pt-3">
            <button
              type="button"
              onClick={() => defaults && setConfig(defaults)}
              disabled={!defaults}
              className="text-xs font-medium text-[var(--text-dim)] transition hover:text-[var(--text-main)] disabled:opacity-50"
            >
              {t("cfgReset")}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <DsButton variant="secondary" size="sm" onClick={onClose}>
                {t("cfgCancel")}
              </DsButton>
              <DsButton variant="accent" size="sm" onClick={save} disabled={saving}>
                {t("cfgSave")}
              </DsButton>
            </div>
          </footer>
        </>
      )}
    </CreatorModalShell>
  );
}
