"use client";

import { ChevronRight, MousePointerClick, Sparkles, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ManualPlacementsModal } from "@/components/campaign-creator/ManualPlacementsModal";
import type { PlacementConfig, PlacementPlatform } from "@/lib/campaign-placements";
import { defaultManualPlacements } from "@/lib/campaign-placements";
import { cn } from "@/lib/cn";

import { ChoiceCardCheck } from "./BudgetChoiceCard";

type Props = {
  value: PlacementConfig;
  onChange: (next: PlacementConfig) => void;
  disabled?: boolean;
};

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

function hasManualPlacementsConfig(value: PlacementConfig): boolean {
  return value.platforms.length > 0 && value.devices.length > 0;
}

function buildPlacementsSummary(
  value: PlacementConfig,
  platformLabel: (platform: PlacementPlatform) => string,
  deviceLabel: (device: "mobile" | "desktop") => string
): string {
  const platforms = value.platforms.map(platformLabel).join(", ");
  const devices = value.devices.map(deviceLabel).join(", ");
  if (platforms && devices) return `${platforms} · ${devices}`;
  return platforms || devices;
}

export function PlacementsPanel({ value, onChange, disabled }: Props) {
  const t = useTranslations("campaignCreator");
  const [modalOpen, setModalOpen] = useState(false);

  function platformLabel(platform: PlacementPlatform): string {
    return t(`placementPlatform_${platform}` as "placementPlatform_facebook");
  }

  function deviceLabel(device: "mobile" | "desktop"): string {
    return t(`placementDevice_${device}` as "placementDevice_mobile");
  }

  const manualConfigured = hasManualPlacementsConfig(value);
  const summary =
    value.mode === "manual" && manualConfigured
      ? buildPlacementsSummary(value, platformLabel, deviceLabel)
      : null;

  return (
    <>
      <section className="campaign-creator-card campaign-creator-budget-side-card">
        <h4 className="campaign-creator-section-title">{t("placements")}</h4>

        <div
          className="campaign-creator-budget-level-stack"
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
          <div className="campaign-creator-budget-special-inline">
            {summary ? (
              <p className="text-[11px] leading-relaxed text-[var(--text-dim)]">{summary}</p>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setModalOpen(true)}
              className="ui-btn-accent-outline inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold sm:w-auto sm:self-start"
            >
              {manualConfigured ? t("editPlacements") : t("selectPlacements")}
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : null}
      </section>

      <ManualPlacementsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </>
  );
}
