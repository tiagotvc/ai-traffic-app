"use client";

import { useTranslations } from "next-intl";

import type { TargetingItem } from "@/lib/campaign-draft";
import { normalizeMetaRadiusKm } from "@/lib/zone-geo-shared";

type GeoRadiusPinListProps = {
  pins: TargetingItem[];
  selectedPin: string | null;
  onSelectPin: (value: string | null) => void;
  onUpdateRadius: (value: string, radius: number) => void;
  onRemove: (value: string) => void;
};

export function GeoRadiusPinList({
  pins,
  selectedPin,
  onSelectPin,
  onUpdateRadius,
  onRemove
}: GeoRadiusPinListProps) {
  const t = useTranslations("campaignCreator");

  if (pins.length === 0) {
    return <p className="text-[11px] text-[var(--text-dimmer)]">{t("mapEmpty")}</p>;
  }

  return (
    <ul className="space-y-2">
      {pins.map((loc) => (
        <li
          key={loc.value}
          onMouseEnter={() => onSelectPin(loc.value)}
          className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 text-xs transition-colors ${
            selectedPin === loc.value
              ? "border-[#1877F2]/50 bg-[#1877F2]/5"
              : "border-[var(--border-color)] bg-[var(--surface-card)]"
          }`}
        >
          <span className="flex-1 font-medium text-[var(--text-main)]">{loc.label}</span>
          <label className="flex items-center gap-1 text-[var(--text-dim)]">
            <span className="min-w-[3rem] font-semibold text-[#1877F2]">
              {loc.meta?.radius ?? 5} km
            </span>
            <input
              type="range"
              min={1}
              max={70}
              value={loc.meta?.radius ?? 5}
              onFocus={() => onSelectPin(loc.value)}
              onChange={(e) => {
                onSelectPin(loc.value);
                onUpdateRadius(loc.value, normalizeMetaRadiusKm(Number(e.target.value)));
              }}
              className="w-24 accent-[#1877F2]"
            />
          </label>
          <button
            type="button"
            onClick={() => onRemove(loc.value)}
            className="text-[var(--text-dimmer)] hover:text-red-500"
            aria-label={t("mapRemovePin")}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
