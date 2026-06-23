"use client";

import { useCallback, useEffect } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";

import type { TargetingItem } from "@/lib/campaign-draft";
import { createMapPinLocation, mapPinCoords } from "@/lib/campaign-draft";

import "leaflet/dist/leaflet.css";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;
const COMMERCIAL_ZOOM = 14;

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export type MapViewport = {
  center: [number, number];
  zoom: number;
};

type Props = {
  pins: TargetingItem[];
  onAdd: (item: TargetingItem) => void;
  viewport?: MapViewport | null;
  commercialMarker?: { lat: number; lng: number; label?: string } | null;
};

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function MapFlyTo({ viewport }: { viewport?: MapViewport | null }) {
  const map = useMap();
  useEffect(() => {
    if (!viewport) return;
    map.flyTo(viewport.center, viewport.zoom, { duration: 0.8 });
  }, [map, viewport]);
  return null;
}

export function GeoRadiusMapInner({ pins, onAdd, viewport, commercialMarker }: Props) {
  const t = useTranslations("campaignCreator");

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      onAdd(
        createMapPinLocation(
          lat,
          lng,
          t("mapPinDefaultLabel", { lat: lat.toFixed(4), lng: lng.toFixed(4) }),
          5
        )
      );
    },
    [onAdd, t]
  );

  const initialCenter: [number, number] =
    viewport?.center ??
    (commercialMarker ? [commercialMarker.lat, commercialMarker.lng] : BRAZIL_CENTER);
  const initialZoom = viewport?.zoom ?? (commercialMarker ? COMMERCIAL_ZOOM : DEFAULT_ZOOM);

  return (
    <div className="space-y-2">
      <div className="h-72 overflow-hidden rounded-xl border border-[var(--border-color)]">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={handleMapClick} />
          <MapFlyTo viewport={viewport} />
          {commercialMarker ? (
            <Marker
              position={[commercialMarker.lat, commercialMarker.lng]}
              icon={L.divIcon({
                className: "",
                html: `<div style="width:14px;height:14px;border-radius:50%;background:#059669;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })}
            />
          ) : null}
          {pins.map((loc) => {
            const coords = mapPinCoords(loc);
            if (!coords) return null;
            const radiusKm = loc.meta?.radius ?? 5;
            return (
              <span key={loc.value}>
                <Marker position={[coords.lat, coords.lng]} icon={defaultIcon} />
                <Circle
                  center={[coords.lat, coords.lng]}
                  radius={radiusKm * 1000}
                  pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.15 }}
                />
              </span>
            );
          })}
        </MapContainer>
      </div>
      <p className="text-[10px] text-[var(--text-dimmer)]">{t("mapClickHint")}</p>
      {commercialMarker?.label ? (
        <p className="text-[10px] text-emerald-700">{t("mapCommercialMarkerHint")}</p>
      ) : null}
    </div>
  );
}
