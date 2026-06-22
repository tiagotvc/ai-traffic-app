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
          className={`rounded-lg px-3 py-1.5 text-xs ${
            value.mode === "advantage_plus"
              ? "bg-[rgba(124,58,237,0.1)] text-[var(--violet)]"
              : "bg-[var(--surface-bg)]"
          }`}
        >
          {t("placementsAdvantage")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(defaultManualPlacements())}
          className={`rounded-lg px-3 py-1.5 text-xs ${
            value.mode === "manual"
              ? "bg-[rgba(124,58,237,0.1)] text-[var(--violet)]"
              : "bg-[var(--surface-bg)]"
          }`}
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
                <label key={p} className="flex items-center gap-1.5 text-xs text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={value.platforms.includes(p)}
                    disabled={disabled}
                    onChange={() => onChange(togglePlacementPlatform(value, p))}
                    className="accent-violet-600"
                  />
                  {platformLabel(p)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-[var(--text-dim)]">{t("placementDevices")}</p>
            <div className="flex flex-wrap gap-2">
              {DEVICE_PLATFORMS.map((d) => (
                <label key={d} className="flex items-center gap-1.5 text-xs text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={value.devices.includes(d)}
                    disabled={disabled}
                    onChange={() =>
                      onChange({
                        ...value,
                        devices: value.devices.includes(d)
                          ? value.devices.filter((x) => x !== d)
                          : [...value.devices, d]
                      })
                    }
                    className="accent-violet-600"
                  />
                  {deviceLabel(d)}
                </label>
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
                    platformOn ? "border-violet-200 bg-violet-50/30" : "border-slate-200 bg-slate-50/50 opacity-60"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={platformOn}
                        disabled={disabled}
                        onChange={() => onChange(togglePlacementPlatform(value, platform))}
                        className="accent-violet-600"
                      />
                      {platformLabel(platform)}
                    </label>
                    {platformOn ? (
                      <span className="text-[10px] text-slate-500">
                        {t("placementSelectedCount", { count: selected.length })}
                      </span>
                    ) : null}
                  </div>
                  {platformOn ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pl-5">
                      {positions.map((pos) => (
                        <label
                          key={positionKey(platform, pos)}
                          className="flex items-center gap-1.5 text-[11px] text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={value.positions.includes(positionKey(platform, pos))}
                            disabled={disabled}
                            onChange={() => onChange(togglePlacementPosition(value, platform, pos))}
                            className="accent-violet-600"
                          />
                          {positionLabel(platform, pos)}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="pl-5 text-[10px] text-slate-400">{t("placementPlatformOffHint")}</p>
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
