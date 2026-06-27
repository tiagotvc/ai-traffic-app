"use client";

import { MousePointerClick, Monitor, Smartphone, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PlacementConfig, PlacementPlatform } from "@/lib/campaign-placements";
import {
  DEVICE_PLATFORMS,
  PLACEMENT_PLATFORMS,
  PLACEMENT_TREE,
  defaultManualPlacements,
  positionKey,
  positionsForPlatform,
  togglePlacementPlatform,
  togglePlacementPosition
} from "@/lib/campaign-placements";
import { cn } from "@/lib/cn";

import { ChoiceCardCheck, MultiSelectChoiceCard } from "./BudgetChoiceCard";

type Props = {
  value: PlacementConfig;
  onChange: (next: PlacementConfig) => void;
  disabled?: boolean;
};

const DEVICE_ICONS = {
  mobile: Smartphone,
  desktop: Monitor
} as const satisfies Record<(typeof DEVICE_PLATFORMS)[number], LucideIcon>;

function PlacementModeCard({
  selected,
  label,
  description,
  icon: Icon,
  recommendedBadge,
  disabled,
  onSelect
}: {
  selected: boolean;
  label: string;
  description: string;
  icon: LucideIcon;
  recommendedBadge?: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <ChoiceCardCheck selected={selected} />
      <span
        className={cn(
          "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
          selected
            ? "campaign-creator-budget-choice-card__icon--selected"
            : "campaign-creator-budget-choice-card__icon--unselected"
        )}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__title-row">
          <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline">
            {label}
          </span>
          {recommendedBadge ? (
            <span className="campaign-creator-budget-choice-card__badge">{recommendedBadge}</span>
          ) : null}
        </span>
        <span className="campaign-creator-budget-choice-card__description">{description}</span>
      </span>
    </button>
  );
}

export function PlacementsPanel({ value, onChange, disabled }: Props) {
  const t = useTranslations("campaignCreator");

  function platformLabel(platform: PlacementPlatform): string {
    return t(`placementPlatform_${platform}` as "placementPlatform_facebook");
  }

  function positionLabel(platform: PlacementPlatform, position: string): string {
    return t(`placementPos_${platform}_${position}` as "placementPos_facebook_feed");
  }

  function deviceLabel(device: (typeof DEVICE_PLATFORMS)[number]): string {
    return t(`placementDevice_${device}` as "placementDevice_mobile");
  }

  return (
    <section className="campaign-creator-card campaign-creator-card--compact">
      <h4 className="campaign-creator-budget-header__title text-sm">{t("placements")}</h4>

      <div
        className="mt-3 grid gap-2 sm:grid-cols-2"
        role="radiogroup"
        aria-label={t("placements")}
      >
        <PlacementModeCard
          selected={value.mode === "advantage_plus"}
          label={t("placementsAdvantage")}
          description={t("placementsAdvantageHint")}
          icon={Sparkles}
          recommendedBadge={t("budgetRecommended")}
          disabled={disabled}
          onSelect={() => onChange({ ...value, mode: "advantage_plus" })}
        />
        <PlacementModeCard
          selected={value.mode === "manual"}
          label={t("placementsManual")}
          description={t("placementsManualHint")}
          icon={MousePointerClick}
          disabled={disabled}
          onSelect={() => onChange(defaultManualPlacements())}
        />
      </div>

      {value.mode === "manual" ? (
        <div className="campaign-creator-placements-manual mt-3 space-y-3 border-t pt-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[var(--text-main)]">{t("placementPlatforms")}</p>
            <div className="flex flex-wrap gap-2">
              {PLACEMENT_PLATFORMS.map((p) => (
                <MultiSelectChoiceCard
                  key={p}
                  selected={value.platforms.includes(p)}
                  label={platformLabel(p)}
                  disabled={disabled}
                  onToggle={() => onChange(togglePlacementPlatform(value, p))}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-[var(--text-main)]">{t("placementDevices")}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEVICE_PLATFORMS.map((d) => (
                <MultiSelectChoiceCard
                  key={d}
                  selected={value.devices.includes(d)}
                  label={deviceLabel(d)}
                  icon={DEVICE_ICONS[d]}
                  disabled={disabled}
                  onToggle={() =>
                    onChange({
                      ...value,
                      devices: value.devices.includes(d)
                        ? value.devices.filter((x) => x !== d)
                        : [...value.devices, d]
                    })
                  }
                />
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-[var(--text-main)]">{t("placementPositions")}</p>
            {PLACEMENT_TREE.map(({ platform, positions }) => {
              const platformOn = value.platforms.includes(platform);
              const selected = positionsForPlatform(value, platform);
              return (
                <div
                  key={platform}
                  className={cn(
                    "rounded-lg border p-3 transition",
                    platformOn
                      ? "border-[var(--ui-accent-border)] bg-[color-mix(in_srgb,var(--ui-accent-muted)_40%,var(--creator-card-bg-inset,var(--surface-bg)))]"
                      : "border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] opacity-70"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <MultiSelectChoiceCard
                      selected={platformOn}
                      label={platformLabel(platform)}
                      disabled={disabled}
                      onToggle={() => onChange(togglePlacementPlatform(value, platform))}
                    />
                    {platformOn ? (
                      <span className="text-[10px] text-[var(--text-dimmer)]">
                        {t("placementSelectedCount", { count: selected.length })}
                      </span>
                    ) : null}
                  </div>
                  {platformOn ? (
                    <div className="flex flex-wrap gap-1.5">
                      {positions.map((pos) => {
                        const key = positionKey(platform, pos);
                        const active = value.positions.includes(key);
                        return (
                          <MultiSelectChoiceCard
                            key={key}
                            selected={active}
                            label={positionLabel(platform, pos)}
                            size="sm"
                            disabled={disabled}
                            onToggle={() => onChange(togglePlacementPosition(value, platform, pos))}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[var(--text-dimmer)]">{t("placementPlatformOffHint")}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
