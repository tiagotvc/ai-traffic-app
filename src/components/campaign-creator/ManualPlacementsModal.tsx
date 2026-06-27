"use client";

import { LayoutGrid, Monitor, Smartphone, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { MultiSelectChoiceCard } from "@/components/campaign-creator/BudgetChoiceCard";
import type { PlacementConfig, PlacementPlatform } from "@/lib/campaign-placements";
import {
  DEVICE_PLATFORMS,
  PLACEMENT_PLATFORMS,
  PLACEMENT_TREE,
  positionKey,
  positionsForPlatform,
  togglePlacementPlatform,
  togglePlacementPosition
} from "@/lib/campaign-placements";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  value: PlacementConfig;
  onChange: (next: PlacementConfig) => void;
  disabled?: boolean;
};

const DEVICE_ICONS = {
  mobile: Smartphone,
  desktop: Monitor
} as const satisfies Record<(typeof DEVICE_PLATFORMS)[number], LucideIcon>;

export function ManualPlacementsModal({ open, onClose, value, onChange, disabled }: Props) {
  const t = useTranslations("campaignCreator");
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  function platformLabel(platform: PlacementPlatform): string {
    return t(`placementPlatform_${platform}` as "placementPlatform_facebook");
  }

  function positionLabel(platform: PlacementPlatform, position: string): string {
    return t(`placementPos_${platform}_${position}` as "placementPos_facebook_feed");
  }

  function deviceLabel(device: (typeof DEVICE_PLATFORMS)[number]): string {
    return t(`placementDevice_${device}` as "placementDevice_mobile");
  }

  function handleSave() {
    onChange(draft);
    onClose();
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("manualPlacementsModalTitle")}
      subtitle={t("placementsManualHint")}
      titleIcon={<LayoutGrid size={16} />}
      width="lg"
      onCancel={onClose}
      onPrimary={handleSave}
      primaryDisabled={disabled}
    >
      <div className="campaign-creator-placements-manual space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--text-main)]">{t("placementPlatforms")}</p>
          <div className="flex flex-wrap gap-2">
            {PLACEMENT_PLATFORMS.map((p) => (
              <MultiSelectChoiceCard
                key={p}
                selected={draft.platforms.includes(p)}
                label={platformLabel(p)}
                disabled={disabled}
                onToggle={() => setDraft((prev) => togglePlacementPlatform(prev, p))}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--text-main)]">{t("placementDevices")}</p>
          <div className="flex flex-wrap gap-2">
            {DEVICE_PLATFORMS.map((d) => (
              <MultiSelectChoiceCard
                key={d}
                selected={draft.devices.includes(d)}
                label={deviceLabel(d)}
                icon={DEVICE_ICONS[d]}
                iconInline
                disabled={disabled}
                onToggle={() =>
                  setDraft((prev) => ({
                    ...prev,
                    devices: prev.devices.includes(d)
                      ? prev.devices.filter((x) => x !== d)
                      : [...prev.devices, d]
                  }))
                }
              />
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-[var(--text-main)]">{t("placementPositions")}</p>
          {PLACEMENT_TREE.map(({ platform, positions }) => {
            const platformOn = draft.platforms.includes(platform);
            const selected = positionsForPlatform(draft, platform);
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
                    onToggle={() => setDraft((prev) => togglePlacementPlatform(prev, platform))}
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
                      const active = draft.positions.includes(key);
                      return (
                        <MultiSelectChoiceCard
                          key={key}
                          selected={active}
                          label={positionLabel(platform, pos)}
                          size="sm"
                          disabled={disabled}
                          onToggle={() =>
                            setDraft((prev) => togglePlacementPosition(prev, platform, pos))
                          }
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
    </CreatorModalShell>
  );
}
