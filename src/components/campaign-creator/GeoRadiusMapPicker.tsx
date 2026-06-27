"use client";

import dynamic from "next/dynamic";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { MapViewport } from "@/components/campaign-creator/GeoRadiusMapInner";
import { GeoRadiusPinList } from "@/components/campaign-creator/GeoRadiusPinList";
import type { TargetingItem } from "@/lib/campaign-draft";
import { isMapPinLocation } from "@/lib/campaign-draft";

const GeoRadiusMapInner = dynamic(
  () => import("@/components/campaign-creator/GeoRadiusMapInner").then((m) => m.GeoRadiusMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="campaign-creator-advanced-targeting-map campaign-creator-advanced-targeting-map--stacked animate-pulse bg-[var(--creator-card-bg-inset,var(--surface-bg))]" />
    )
  }
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
  instanceKey?: string;
  compact?: boolean;
  split?: boolean;
  /** Renders only the map shell (controls live in the parent panel). */
  mapOnly?: boolean;
  onOpenMarkedAreas?: () => void;
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
  centerCommercialHint,
  instanceKey,
  compact = false,
  split = false,
  mapOnly = false,
  onOpenMarkedAreas
}: Props) {
  const t = useTranslations("campaignCreator");
  const mapPins = pins.filter(isMapPinLocation);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  const handleAdd = (item: TargetingItem) => {
    onAdd(item);
    setSelectedPin(item.value);
  };

  if (mapOnly) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <GeoRadiusMapInner
          key={instanceKey}
          pins={mapPins}
          onAdd={handleAdd}
          viewport={viewport}
          commercialMarker={commercialMarker}
          selectedPin={selectedPin}
          stacked
        />
      </div>
    );
  }

  if (split) {
    return (
      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="min-w-0 text-[10px] leading-snug text-[var(--text-dim)]">{t("mapClickHint")}</p>
          {onCenterCommercial ? (
            <button
              type="button"
              onClick={onCenterCommercial}
              disabled={centerCommercialDisabled}
              className="ui-btn-secondary shrink-0 whitespace-nowrap px-2 py-1 text-[10px] disabled:opacity-50"
            >
              {t("centerCommercialAddress")}
            </button>
          ) : null}
        </div>
        {centerCommercialHint && centerCommercialDisabled ? (
          <p className="text-[10px] text-[var(--text-dimmer)]">{centerCommercialHint}</p>
        ) : null}

        <GeoRadiusMapInner
          key={instanceKey}
          pins={mapPins}
          onAdd={handleAdd}
          viewport={viewport}
          commercialMarker={commercialMarker}
          selectedPin={selectedPin}
          split
        />

        {onOpenMarkedAreas ? (
          <button
            type="button"
            onClick={onOpenMarkedAreas}
            className="ui-btn-secondary inline-flex w-full items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
          >
            {t("markedAreasViewEditButton", { count: mapPins.length })}
            <ChevronRight size={13} strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text-main)]">{t("mapSectionTitle")}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--text-dim)]">{t("mapClickHint")}</p>
          </div>
          {onCenterCommercial ? (
            <button
              type="button"
              onClick={onCenterCommercial}
              disabled={centerCommercialDisabled}
              className="ui-btn-secondary shrink-0 whitespace-nowrap px-2 py-1 text-[10px] disabled:opacity-50"
            >
              {t("centerCommercialAddress")}
            </button>
          ) : null}
        </div>
        {centerCommercialHint && centerCommercialDisabled ? (
          <p className="text-[10px] text-[var(--text-dimmer)]">{centerCommercialHint}</p>
        ) : null}

        <GeoRadiusMapInner
          key={instanceKey}
          pins={mapPins}
          onAdd={handleAdd}
          viewport={viewport}
          commercialMarker={commercialMarker}
          selectedPin={selectedPin}
          compact
        />

        {onOpenMarkedAreas ? (
          <button
            type="button"
            onClick={onOpenMarkedAreas}
            className="ui-btn-secondary inline-flex w-full items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
          >
            {t("markedAreasViewEditButton", { count: mapPins.length })}
            <ChevronRight size={13} strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
    );
  }

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
      {centerCommercialHint && centerCommercialDisabled ? (
        <p className="text-[10px] text-[var(--text-dimmer)]">{centerCommercialHint}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="order-2 space-y-2 lg:order-1">
          <p className="text-xs font-medium text-[var(--text-dim)]">{t("mapPinsList")}</p>
          <GeoRadiusPinList
            pins={mapPins}
            selectedPin={selectedPin}
            onSelectPin={setSelectedPin}
            onUpdateRadius={onUpdateRadius}
            onRemove={onRemove}
          />
        </div>
        <div className="order-1 lg:order-2">
          <GeoRadiusMapInner
            key={instanceKey}
            pins={mapPins}
            onAdd={handleAdd}
            viewport={viewport}
            commercialMarker={commercialMarker}
            selectedPin={selectedPin}
          />
        </div>
      </div>
    </div>
  );
}

export type { MapViewport };
