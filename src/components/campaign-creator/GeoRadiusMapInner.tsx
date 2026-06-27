"use client";

import { Fragment, useCallback, useEffect, useRef } from "react";
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";

import type { TargetingItem } from "@/lib/campaign-draft";
import { createMapPinLocation, mapPinCoords } from "@/lib/campaign-draft";

import "leaflet/dist/leaflet.css";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;
const COMMERCIAL_ZOOM = 14;

/** Meta Ads Manager–style targeting colors */
const META_TARGET_BLUE = "#1877F2";
const META_TARGET_BLUE_ACTIVE = "#0C63D4";

function createTargetingPinIcon(active: boolean) {
  const size = active ? 12 : 10;
  const color = active ? META_TARGET_BLUE_ACTIVE : META_TARGET_BLUE;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

export type MapViewport = {
  center: [number, number];
  zoom: number;
};

type Props = {
  pins: TargetingItem[];
  onAdd: (item: TargetingItem) => void;
  viewport?: MapViewport | null;
  commercialMarker?: { lat: number; lng: number; label?: string } | null;
  selectedPin?: string | null;
  compact?: boolean;
  split?: boolean;
  stacked?: boolean;
};

function MapInvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

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

function extendBoundsForCircle(
  bounds: L.LatLngBounds,
  lat: number,
  lng: number,
  radiusM: number
) {
  const latRad = (lat * Math.PI) / 180;
  const latDelta = radiusM / 111320;
  const lngDelta = radiusM / (111320 * Math.cos(latRad) || 1);
  bounds.extend([lat - latDelta, lng - lngDelta]);
  bounds.extend([lat + latDelta, lng + lngDelta]);
}

function buildPinBounds(pins: TargetingItem[]) {
  const bounds = L.latLngBounds([]);
  for (const loc of pins) {
    const coords = mapPinCoords(loc);
    if (!coords) continue;
    const radiusM = (loc.meta?.radius ?? 5) * 1000;
    extendBoundsForCircle(bounds, coords.lat, coords.lng, radiusM);
  }
  return bounds;
}

/** Zoom map to include all pin circles on mount, pin changes, and when the map resizes. */
function FitBoundsToPins({
  pins,
  disabled
}: {
  pins: TargetingItem[];
  disabled?: boolean;
}) {
  const map = useMap();
  const pinSignature = pins
    .map((p) => `${p.value}:${p.meta?.radius ?? 5}`)
    .join("|");
  const retryTimersRef = useRef<number[]>([]);

  const fit = useCallback(() => {
    if (disabled || pins.length === 0) return;

    const bounds = buildPinBounds(pins);
    if (!bounds.isValid()) return;

    map.invalidateSize();
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  }, [disabled, map, pins]);

  useEffect(() => {
    retryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    retryTimersRef.current = [];

    if (disabled || pins.length === 0) return;

    const scheduleFit = () => {
      fit();
      retryTimersRef.current.push(window.setTimeout(fit, 120));
      retryTimersRef.current.push(window.setTimeout(fit, 400));
    };

    map.whenReady(() => {
      map.invalidateSize();
      window.requestAnimationFrame(scheduleFit);
    });

    return () => {
      retryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      retryTimersRef.current = [];
    };
  }, [disabled, fit, map, pinSignature, pins.length]);

  useEffect(() => {
    if (disabled) return;

    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      if (pins.length === 0) return;
      fit();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [disabled, fit, map, pins.length]);

  return null;
}

function RadiusPinLayer({
  loc,
  selected
}: {
  loc: TargetingItem;
  selected: boolean;
}) {
  const coords = mapPinCoords(loc);
  if (!coords) return null;

  const radiusKm = loc.meta?.radius ?? 5;
  const stroke = selected ? META_TARGET_BLUE_ACTIVE : META_TARGET_BLUE;

  return (
    <Fragment>
      <Circle
        center={[coords.lat, coords.lng]}
        radius={radiusKm * 1000}
        pathOptions={{
          color: stroke,
          weight: selected ? 2.5 : 2,
          fillColor: stroke,
          fillOpacity: selected ? 0.24 : 0.18
        }}
      />
      <Marker position={[coords.lat, coords.lng]} icon={createTargetingPinIcon(selected)}>
        {selected ? (
          <Tooltip
            permanent
            direction="top"
            offset={[0, -6]}
            className="geo-radius-tooltip"
          >
            {radiusKm} km
          </Tooltip>
        ) : null}
      </Marker>
    </Fragment>
  );
}

export function GeoRadiusMapInner({
  pins,
  onAdd,
  viewport,
  commercialMarker,
  selectedPin,
  compact = false,
  split = false,
  stacked = false
}: Props) {
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

  const mapShellClass = stacked
    ? "campaign-creator-advanced-targeting-map campaign-creator-advanced-targeting-map--stacked overflow-hidden rounded-xl border border-[var(--creator-card-border,var(--border-color))]"
    : split
      ? "campaign-creator-advanced-targeting-map campaign-creator-advanced-targeting-map--split overflow-hidden rounded-xl border border-[var(--creator-card-border,var(--border-color))]"
      : compact
        ? "campaign-creator-advanced-targeting-map overflow-hidden rounded-xl border border-[var(--creator-card-border,var(--border-color))]"
        : "h-[200px] overflow-hidden rounded-xl border border-[var(--border-color)] lg:h-52";

  return (
    <div className={compact || split || stacked ? "flex min-h-0 flex-1 flex-col" : "space-y-2"}>
      <div className={mapShellClass}>
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
          <MapInvalidateSize />
          <MapClickHandler onPick={handleMapClick} />
          <MapFlyTo viewport={viewport} />
          <FitBoundsToPins pins={pins} disabled={!!viewport} />
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
          {pins.map((loc) => (
            <RadiusPinLayer key={loc.value} loc={loc} selected={loc.value === selectedPin} />
          ))}
        </MapContainer>
      </div>
      {!compact && !split && !stacked ? (
        <>
          <p className="text-[10px] text-[var(--text-dimmer)]">{t("mapClickHint")}</p>
          {commercialMarker?.label ? (
            <p className="text-[10px] text-emerald-700">{t("mapCommercialMarkerHint")}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
