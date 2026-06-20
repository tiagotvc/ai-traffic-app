"use client";

import { useCallback, useEffect, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";

import { MetaTargetingSelect } from "@/components/MetaTargetingSelect";
import type { TargetingItem } from "@/lib/campaign-draft";

import "leaflet/dist/leaflet.css";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type Props = {
  locations: TargetingItem[];
  onAdd: (item: TargetingItem) => void;
  onRemove: (value: string) => void;
  onUpdateRadius: (value: string, radius: number) => void;
};

function MapClickHandler({
  onPick
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export function GeoRadiusMapInner({ locations, onAdd }: Props) {
  const t = useTranslations("campaignCreator");
  const [pending, setPending] = useState<TargetingItem[]>([]);

  const handleGeoPick = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `/api/meta/targeting-search?type=geo&q=${encodeURIComponent(`${lat},${lng}`)}&limit=1`
        );
        const j = (await res.json()) as { items?: TargetingItem[] };
        const item = j.items?.[0];
        if (item) {
          onAdd({
            ...item,
            meta: {
              ...item.meta,
              type: item.meta?.type ?? "city",
              radius: item.meta?.radius ?? 10,
              distanceUnit: "kilometer"
            }
          });
        }
      } catch {
        /* ignore */
      }
    },
    [onAdd]
  );

  useEffect(() => {
    setPending(locations);
  }, [locations]);

  return (
    <div className="space-y-2">
      <MetaTargetingSelect
        type="geo"
        placeholder={t("mapSearchPlaceholder")}
        selected={pending}
        onAdd={(item) =>
          onAdd({
            ...item,
            meta: {
              type: item.meta?.type ?? "city",
              countryCode: item.meta?.countryCode,
              kind: item.meta?.kind,
              radius: 10,
              distanceUnit: "kilometer"
            }
          })
        }
        onRemove={() => {}}
      />
      <div className="h-64 overflow-hidden rounded-xl border border-[var(--border-color)]">
        <MapContainer
          center={BRAZIL_CENTER}
          zoom={4}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={handleGeoPick} />
          {locations.map((loc) => {
            const coords = loc.meta?.kind?.split(",");
            const lat = coords?.[0] ? Number(coords[0]) : null;
            const lng = coords?.[1] ? Number(coords[1]) : null;
            if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
              return null;
            }
            const radiusKm = loc.meta?.radius ?? 10;
            return (
              <span key={loc.value}>
                <Marker position={[lat, lng]} icon={defaultIcon} />
                <Circle
                  center={[lat, lng]}
                  radius={radiusKm * 1000}
                  pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.15 }}
                />
              </span>
            );
          })}
        </MapContainer>
      </div>
      <p className="text-[10px] text-[var(--text-dimmer)]">{t("mapClickHint")}</p>
    </div>
  );
}
