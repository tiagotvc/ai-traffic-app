"use client";

import { Fragment, useEffect } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";

import {
  findPinAtLocation,
  type ZoneMapPin,
  zonePinSelectionKey
} from "@/lib/zone-geo-shared";

import "leaflet/dist/leaflet.css";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];
const DEFAULT_ZOOM = 4;

const META_TARGET_BLUE = "#1877F2";
const META_TARGET_BLUE_ACTIVE = "#0C63D4";
const META_EXCLUDE_RED = "#E41E3F";
const META_EXCLUDE_RED_ACTIVE = "#C91830";

function createPinIcon(color: string, active: boolean) {
  const size = active ? 12 : 10;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
}

type Props = {
  pins: ZoneMapPin[];
  selectedKey?: string | null;
  mapKey?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onPinSelect?: (selectionKey: string) => void;
  onPinHover?: (selectionKey: string) => void;
};

function MapInvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function MapClickHandler({
  pins,
  onNewPin,
  onPinSelect
}: {
  pins: ZoneMapPin[];
  onNewPin: (lat: number, lng: number) => void;
  onPinSelect: (selectionKey: string) => void;
}) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const hit = findPinAtLocation(pins, lat, lng);
      if (hit) {
        onPinSelect(zonePinSelectionKey(hit));
        return;
      }
      onNewPin(lat, lng);
    }
  });
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

function FitBoundsToPins({ pins }: { pins: ZoneMapPin[] }) {
  const map = useMap();
  const pinSignature = pins.map((p) => zonePinSelectionKey(p)).join("|");

  useEffect(() => {
    if (pins.length === 0) return;

    const fit = () => {
      const bounds = L.latLngBounds([]);
      for (const pin of pins) {
        extendBoundsForCircle(bounds, pin.latitude, pin.longitude, pin.radius * 1000);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
      }
    };

    map.whenReady(() => {
      map.invalidateSize();
      window.requestAnimationFrame(fit);
    });
  }, [map, pinSignature]);

  return null;
}

function RadiusPinLayer({
  pin,
  selected,
  onHover
}: {
  pin: ZoneMapPin;
  selected: boolean;
  onHover?: (selectionKey: string) => void;
}) {
  const isExclude = pin.mode === "exclude";
  const stroke = isExclude
    ? selected
      ? META_EXCLUDE_RED_ACTIVE
      : META_EXCLUDE_RED
    : selected
      ? META_TARGET_BLUE_ACTIVE
      : META_TARGET_BLUE;

  const selectionKey = zonePinSelectionKey(pin);
  const hover = () => onHover?.(selectionKey);

  return (
    <Fragment>
      <Circle
        center={[pin.latitude, pin.longitude]}
        radius={pin.radius * 1000}
        pathOptions={{
          color: stroke,
          weight: selected ? 2.5 : 2,
          fillColor: stroke,
          fillOpacity: isExclude ? (selected ? 0.2 : 0.14) : selected ? 0.24 : 0.18
        }}
        eventHandlers={{ mouseover: hover }}
      />
      <Marker
        position={[pin.latitude, pin.longitude]}
        icon={createPinIcon(stroke, selected)}
        eventHandlers={{ mouseover: hover }}
      >
        {selected ? (
          <Tooltip
            permanent
            direction="top"
            offset={[0, -6]}
            className={isExclude ? "geo-radius-tooltip-exclude" : "geo-radius-tooltip"}
          >
            {pin.radius} km
          </Tooltip>
        ) : null}
      </Marker>
    </Fragment>
  );
}

export function ZoneGeoMapInner({
  pins,
  selectedKey,
  mapKey,
  onMapClick,
  onPinSelect,
  onPinHover
}: Props) {
  const initialCenter: [number, number] =
    pins.length === 1
      ? [pins[0]!.latitude, pins[0]!.longitude]
      : pins.length > 0
        ? [pins[0]!.latitude, pins[0]!.longitude]
        : BRAZIL_CENTER;
  const initialZoom = pins.length === 1 ? 13 : DEFAULT_ZOOM;

  return (
    <div className="h-80 cursor-crosshair overflow-hidden rounded-xl border border-[var(--border-color)]">
      <MapContainer
        key={mapKey ?? "zone-map"}
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
        {onMapClick && onPinSelect ? (
          <MapClickHandler pins={pins} onNewPin={onMapClick} onPinSelect={onPinSelect} />
        ) : null}
        <FitBoundsToPins pins={pins} />
        {pins.map((pin) => {
          const selectionKey = zonePinSelectionKey(pin);
          return (
            <RadiusPinLayer
              key={selectionKey}
              pin={pin}
              selected={selectionKey === selectedKey}
              onHover={onPinHover}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
