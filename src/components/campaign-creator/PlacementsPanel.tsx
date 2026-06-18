"use client";

import { useTranslations } from "next-intl";

import type { PlacementConfig } from "@/lib/campaign-placements";
import {
  AUDIENCE_NETWORK_POSITIONS,
  DEVICE_PLATFORMS,
  FACEBOOK_POSITIONS,
  INSTAGRAM_POSITIONS,
  MESSENGER_POSITIONS,
  PLACEMENT_PLATFORMS
} from "@/lib/campaign-placements";

type Props = {
  value: PlacementConfig;
  onChange: (next: PlacementConfig) => void;
  disabled?: boolean;
};

function toggle<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function PlacementsPanel({ value, onChange, disabled }: Props) {
  const t = useTranslations("campaignCreator");

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...value, mode: "advantage_plus" })}
          className={`rounded-lg px-3 py-1.5 text-xs ${
            value.mode === "advantage_plus" ? "bg-violet-100 text-violet-800" : "bg-slate-100"
          }`}
        >
          {t("placementsAdvantage")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange({
              mode: "manual",
              platforms: ["facebook", "instagram"],
              positions: ["feed", "story"],
              devices: ["mobile", "desktop"]
            })
          }
          className={`rounded-lg px-3 py-1.5 text-xs ${
            value.mode === "manual" ? "bg-violet-100 text-violet-800" : "bg-slate-100"
          }`}
        >
          {t("placementsManual")}
        </button>
      </div>

      {value.mode === "manual" ? (
        <>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-700">{t("placementPlatforms")}</p>
            <div className="flex flex-wrap gap-2">
              {PLACEMENT_PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={value.platforms.includes(p)}
                    disabled={disabled}
                    onChange={() =>
                      onChange({ ...value, platforms: toggle(value.platforms, p) })
                    }
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-700">{t("placementDevices")}</p>
            <div className="flex flex-wrap gap-2">
              {DEVICE_PLATFORMS.map((d) => (
                <label key={d} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={value.devices.includes(d)}
                    disabled={disabled}
                    onChange={() => onChange({ ...value, devices: toggle(value.devices, d) })}
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-700">{t("placementPositions")}</p>
            <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
              {[...FACEBOOK_POSITIONS, ...INSTAGRAM_POSITIONS, ...AUDIENCE_NETWORK_POSITIONS, ...MESSENGER_POSITIONS].map(
                (pos) => (
                  <label key={pos} className="flex items-center gap-1 text-[10px]">
                    <input
                      type="checkbox"
                      checked={value.positions.includes(pos)}
                      disabled={disabled}
                      onChange={() =>
                        onChange({ ...value, positions: toggle(value.positions, pos) })
                      }
                    />
                    {pos}
                  </label>
                )
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
