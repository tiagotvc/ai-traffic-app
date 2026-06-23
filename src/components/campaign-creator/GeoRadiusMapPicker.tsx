"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import type { MapViewport } from "@/components/campaign-creator/GeoRadiusMapInner";
import type { TargetingItem } from "@/lib/campaign-draft";
import { isMapPinLocation } from "@/lib/campaign-draft";

const GeoRadiusMapInner = dynamic(
  () => import("@/components/campaign-creator/GeoRadiusMapInner").then((m) => m.GeoRadiusMapInner),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-xl bg-[var(--surface-bg)]" /> }
);

type Props = {
  pins: TargetingItem[];
  onAdd: (item: TargetingItem) => void;
  onRemove: (value: string) => void;
  onUpdateRadius: (value: string, radius: number) => void;
  viewport?: MapViewport | null;
  commercialMarker?: { lat: number; lng: number; label?: string } | null;
  onCenterCommercial?: () => void;
  centerCommercialDisabled?: boolean;
  centerCommercialHint?: string | null;
};

export function GeoRadiusMapPicker({
  pins,
  onAdd,
  onRemove,
  onUpdateRadius,
  viewport,
  commercialMarker,
  onCenterCommercial,
  centerCommercialDisabled,
  centerCommercialHint
}: Props) {
  const t = useTranslations("campaignCreator");
  const mapPins = pins.filter(isMapPinLocation);

  return (
    <div className="space-y-3 rounded-xl border border-violet-200/60 bg-violet-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--text-main)]">{t("mapSectionTitle")}</p>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("mapSectionHint")}</p>
        </div>
        {onCenterCommercial ? (
          <button
            type="button"
            onClick={onCenterCommercial}
            disabled={centerCommercialDisabled}
            className="ui-btn-secondary whitespace-nowrap text-xs disabled:opacity-50"
          >
            {t("centerCommercialAddress")}
          </button>
        ) : null}
      </div>
      {centerCommercialHint ? (
        <p className="text-[11px] text-amber-800">{centerCommercialHint}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-dim)]">{t("mapPinsList")}</p>
          {mapPins.length === 0 ? (
            <p className="text-[11px] text-[var(--text-dimmer)]">{t("mapEmpty")}</p>
          ) : (
            <ul className="space-y-2">
              {mapPins.map((loc) => (
                <li
                  key={loc.value}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-2 text-xs"
                >
                  <span className="flex-1 font-medium text-[var(--text-main)]">{loc.label}</span>
                  <label className="flex items-center gap-1 text-[var(--text-dim)]">
                    {loc.meta?.radius ?? 5} km
                    <input
                      type="range"
                      min={1}
                      max={80}
                      value={loc.meta?.radius ?? 5}
                      onChange={(e) => onUpdateRadius(loc.value, Number(e.target.value))}
                      className="w-20 accent-violet-600"
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
          )}
        </div>
        <GeoRadiusMapInner
          pins={mapPins}
          onAdd={onAdd}
          viewport={viewport}
          commercialMarker={commercialMarker}
        />
      </div>
    </div>
  );
}

export type { MapViewport };
