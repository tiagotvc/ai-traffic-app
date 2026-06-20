"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import type { TargetingItem } from "@/lib/campaign-draft";

const GeoRadiusMapInner = dynamic(
  () => import("@/components/campaign-creator/GeoRadiusMapInner").then((m) => m.GeoRadiusMapInner),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-[var(--surface-bg)]" /> }
);

type Props = {
  locations: TargetingItem[];
  onAdd: (item: TargetingItem) => void;
  onRemove: (value: string) => void;
  onUpdateRadius: (value: string, radius: number) => void;
};

export function GeoRadiusMapPicker(props: Props) {
  const t = useTranslations("campaignCreator");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--text-dim)]">{t("mapLocations")}</p>
        {props.locations.length === 0 ? (
          <p className="text-[11px] text-[var(--text-dimmer)]">{t("mapEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {props.locations.map((loc) => (
              <li
                key={loc.value}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-color)] p-2 text-xs"
              >
                <span className="flex-1 font-medium text-[var(--text-main)]">{loc.label}</span>
                <label className="flex items-center gap-1 text-[var(--text-dim)]">
                  {loc.meta?.radius ?? 10} km
                  <input
                    type="range"
                    min={1}
                    max={80}
                    value={loc.meta?.radius ?? 10}
                    onChange={(e) =>
                      props.onUpdateRadius(loc.value, Number(e.target.value))
                    }
                    className="w-20 accent-violet-600"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => props.onRemove(loc.value)}
                  className="text-[var(--text-dimmer)] hover:text-red-500"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <GeoRadiusMapInner {...props} />
    </div>
  );
}
