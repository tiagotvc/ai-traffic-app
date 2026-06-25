"use client";

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

type Props = {
  value: PlacementConfig;
  onChange: (next: PlacementConfig) => void;
  disabled?: boolean;
};

function toggleBtnClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-xs transition ${
    active
      ? "bg-[rgba(124,58,237,0.1)] font-medium text-[var(--violet)] ring-1 ring-violet-200"
      : "bg-[var(--surface-bg)] text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
  }`;
}

function chipBtnClass(active: boolean) {
  return `rounded-md px-2 py-1 text-[11px] transition ${
    active
      ? "bg-[rgba(124,58,237,0.12)] font-medium text-[var(--violet)] ring-1 ring-violet-200"
      : "bg-[var(--surface-bg)] text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
  }`;
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
    <div className="space-y-3 rounded-xl border border-[var(--border-color)] p-3">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...value, mode: "advantage_plus" })}
          className={toggleBtnClass(value.mode === "advantage_plus")}
        >
          {t("placementsAdvantage")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(defaultManualPlacements())}
          className={toggleBtnClass(value.mode === "manual")}
        >
          {t("placementsManual")}
        </button>
      </div>

      {value.mode === "manual" ? (
        <>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--text-dim)]">{t("placementPlatforms")}</p>
            <div className="flex flex-wrap gap-2">
              {PLACEMENT_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(togglePlacementPlatform(value, p))}
                  className={toggleBtnClass(value.platforms.includes(p))}
                >
                  {platformLabel(p)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-[var(--text-dim)]">{t("placementDevices")}</p>
            <div className="flex flex-wrap gap-2">
              {DEVICE_PLATFORMS.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...value,
                      devices: value.devices.includes(d)
                        ? value.devices.filter((x) => x !== d)
                        : [...value.devices, d]
                    })
                  }
                  className={toggleBtnClass(value.devices.includes(d))}
                >
                  {deviceLabel(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-[var(--text-dim)]">{t("placementPositions")}</p>
            {PLACEMENT_TREE.map(({ platform, positions }) => {
              const platformOn = value.platforms.includes(platform);
              const selected = positionsForPlatform(value, platform);
              return (
                <div
                  key={platform}
                  className={`rounded-lg border p-3 transition ${
                    platformOn
                      ? "border-violet-200 bg-violet-50/30"
                      : "border-[var(--border-color)] bg-[var(--surface-bg)]/50 opacity-70"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange(togglePlacementPlatform(value, platform))}
                      className={`${toggleBtnClass(platformOn)} font-semibold`}
                    >
                      {platformLabel(platform)}
                    </button>
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
                          <button
                            key={key}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(togglePlacementPosition(value, platform, pos))}
                            className={chipBtnClass(active)}
                          >
                            {positionLabel(platform, pos)}
                          </button>
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
        </>
      ) : null}
    </div>
  );
}
