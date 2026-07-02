"use client";

import { AlertTriangle, SlidersHorizontal, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import { DsInfoBanner } from "@/design-system";
import {
  isUnusualRankDirection,
  METRIC_DEFAULT_DIR,
  metricUsesLowerIsBetter,
  RANKABLE_METRICS,
  RANKABLE_PRESETS,
  type RankConfig,
  type RankSpec
} from "@/lib/creative-ranking";
import { METRIC_BY_KEY, type MetricKey } from "@/lib/dashboard-metrics";

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
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

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

  function setSpec(preset: string, patch: Partial<RankSpec>) {
    setConfig((c) =>
      c
        ? {
            ...c,
            specs: {
              ...c.specs,
              [preset]: { ...c.specs[preset], ...patch }
            }
          }
        : c
    );
  }

  function save() {
    if (!config) return;
    setSaving(true);
    setBlockedReason(null);
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
        } else if (j.code === "PLAN_LIMIT") {
          setBlockedReason(j.error || t("cfgPlanLimit"));
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
      width="xl"
      onClear={() => defaults && setConfig(defaults)}
      clearDisabled={!defaults}
      onCancel={onClose}
      cancelLabel={t("cfgCancel")}
      onPrimary={save}
      primaryLabel={t("cfgSave")}
      primaryDisabled={!config}
      primaryLoading={saving}
      showPrimaryCheck={false}
    >
      {!config ? (
        <div className="py-8 text-center text-sm text-[var(--text-dim)]">…</div>
      ) : (
        <div className="space-y-4">
          {blockedReason ? (
            <DsInfoBanner
              className="text-xs leading-relaxed ui-alert-danger"
              icon={<AlertTriangle size={16} aria-hidden />}
              role="note"
              actions={
                <a href="/billing/checkout" className="text-xs font-semibold underline underline-offset-2">
                  {t("cfgUpgrade")}
                </a>
              }
            >
              {blockedReason}
            </DsInfoBanner>
          ) : null}
          <DsInfoBanner className="text-xs leading-relaxed">{t("cfgHelpIntro")}</DsInfoBanner>

          <div className="rounded-xl border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-3 py-3">
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
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-dim)]">{t("cfgMinImprHelp")}</p>
          </div>

          <div className="space-y-2">
            <div>
              <h3 className="campaign-creator-orion-section-label">{t("cfgByCampaignType")}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dim)]">{t("cfgByCampaignTypeHelp")}</p>
            </div>

            {RANKABLE_PRESETS.map((preset) => {
              const spec = config.specs[preset];
              const unusual = isUnusualRankDirection(spec.metric, spec.dir);
              const lowerIsBetter = metricUsesLowerIsBetter(spec.metric);

              return (
                <div
                  key={preset}
                  className="campaign-creator-sidebar-card-inset grid gap-2.5 px-3 py-3 sm:grid-cols-2 sm:items-start"
                >
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text-main)]">{tPresets(preset)}</span>
                      <span className="text-[10px] text-[var(--text-dimmer)]">
                        {t("cfgRankedByPreview", {
                          metric: tMetrics(METRIC_BY_KEY[spec.metric].label),
                          direction: spec.dir === "desc" ? t("rankHigher") : t("rankLower")
                        })}
                      </span>
                    </div>
                  </div>

                  <FilterSelectDropdown
                    creatorField
                    icon={<TrendingUp size={14} />}
                    label={t("cfgMetric")}
                    placeholder={t("cfgMetric")}
                    clearable={false}
                    value={spec.metric}
                    onChange={(v) => {
                      const metric = v as MetricKey;
                      const patch: Partial<RankSpec> = { metric };
                      const typical = METRIC_DEFAULT_DIR[metric];
                      if (typical) patch.dir = typical;
                      setSpec(preset, patch);
                    }}
                    options={metricOptions}
                    className="min-w-0"
                  />
                  <FilterSelectDropdown
                    creatorField
                    icon={spec.dir === "desc" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    label={t("cfgDirection")}
                    placeholder={t("cfgDirection")}
                    clearable={false}
                    value={spec.dir}
                    onChange={(v) => setSpec(preset, { dir: v as "asc" | "desc" })}
                    options={directionOptions}
                    className="min-w-0"
                  />

                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-[11px] leading-relaxed text-[var(--text-dim)]">
                      {lowerIsBetter ? t("cfgDirectionCostHint") : t("cfgDirectionVolumeHint")}
                    </p>

                    {unusual ? (
                      <p className="inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
                        {t("cfgUnusualDirection")}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <DsInfoBanner className="text-xs leading-relaxed">
            {t("cfgScoreNote")}
          </DsInfoBanner>
        </div>
      )}
    </CreatorModalShell>
  );
}
