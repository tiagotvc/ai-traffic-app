"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { ZoneSummary } from "@/components/audiences/ZonesLibraryClient";
import type { ZoneGeoRules } from "@/db/entities/UserZone";
import {
  addZoneLocation,
  excludeZoneLocation,
  normalizeMetaRadiusKm,
  normalizeZoneCustomLocation,
  normalizeZoneGeoRules,
  removeZoneLocation,
  restoreZoneLocation,
  updateZoneLocationRadius,
  zoneCustomLocationToPin,
  zoneGeoRulesToMapPins,
  zoneLocationKey,
  zonePinSelectionKey,
  type ZoneCustomLocation
} from "@/lib/zone-geo-shared";

const ZoneGeoMapInner = dynamic(
  () => import("@/components/audiences/ZoneGeoMapInner").then((m) => m.ZoneGeoMapInner),
  { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-xl bg-[var(--surface-bg)]" /> }
);

type Props = {
  zone: ZoneSummary;
  onClose: () => void;
  onSaved: (zone: ZoneSummary) => void;
  /** Quando true, confirma geoRules localmente sem PATCH na API. */
  draftOnly?: boolean;
  onDraftConfirm?: (geoRules: ZoneGeoRules) => void;
};

type PendingPin = { lat: number; lng: number };

function formatLocationLabel(loc: ZoneCustomLocation): string {
  if (loc.label?.trim()) return loc.label.trim();
  return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
}

function formatUpdatedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function defaultNewPinRadius(rules: ZoneGeoRules): number {
  const first = rules.customLocations?.[0] ?? rules.excludedCustomLocations?.[0];
  return first?.radius ?? 3;
}

function clampRadius(value: number): number {
  return normalizeMetaRadiusKm(value);
}

function RadiusKmField({
  value,
  accent,
  onChange,
  onFocus
}: {
  value: number;
  accent: string;
  onChange: (radius: number) => void;
  onFocus: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  function commit() {
    const parsed = Number(draft.replace(",", "."));
    onChange(clampRadius(parsed));
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={onFocus}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        autoFocus
        className="w-14 rounded border border-[var(--border-subtle)] bg-[var(--surface-bg)] px-1 py-0.5 text-xs font-semibold"
        style={{ color: accent }}
      />
    );
  }

  return (
    <button
      type="button"
      className="min-w-[3rem] text-left text-xs font-semibold underline decoration-dotted underline-offset-2"
      style={{ color: accent }}
      onClick={() => {
        onFocus();
        setDraft(String(value));
        setEditing(true);
      }}
    >
      {value} km
    </button>
  );
}

export function ZoneDetailPanel({ zone, onClose, onSaved, draftOnly, onDraftConfirm }: Props) {
  const t = useTranslations("audiences");
  const locale = useLocale();
  const normalizedZoneRules = useMemo(() => normalizeZoneGeoRules(zone.geoRules), [zone.geoRules]);
  const [geoRules, setGeoRules] = useState<ZoneGeoRules>(normalizedZoneRules);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    setGeoRules(normalizedZoneRules);
    setSelectedKey(null);
    setPendingPin(null);
  }, [zone.id, normalizedZoneRules]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMapReady(true), 0);
    return () => {
      window.clearTimeout(timer);
      setMapReady(false);
    };
  }, [zone.id]);

  useEffect(() => {
    if (!selectedKey) return;
    listRefs.current[selectedKey]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedKey]);

  const mapPins = useMemo(() => zoneGeoRulesToMapPins(geoRules), [geoRules]);
  const included = geoRules.customLocations ?? [];
  const excluded = geoRules.excludedCustomLocations ?? [];
  const dirty = JSON.stringify(geoRules) !== JSON.stringify(normalizedZoneRules);
  const defaultRadius = defaultNewPinRadius(geoRules);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPendingPin({ lat, lng });
  }, []);

  const handlePinSelect = useCallback((selectionKey: string) => {
    setPendingPin(null);
    setSelectedKey(selectionKey);
  }, []);

  const handlePinHover = useCallback((selectionKey: string) => {
    setSelectedKey(selectionKey);
  }, []);

  function confirmPendingPin(mode: "include" | "exclude") {
    if (!pendingPin) return;
    const label = t("zoneManualPinLabel", {
      lat: pendingPin.lat.toFixed(4),
      lng: pendingPin.lng.toFixed(4)
    });
    setGeoRules((prev) =>
      addZoneLocation(
        prev,
        {
          latitude: pendingPin.lat,
          longitude: pendingPin.lng,
          radius: defaultRadius,
          distanceUnit: "kilometer",
          label
        },
        mode
      )
    );
    const key = zoneLocationKey({ latitude: pendingPin.lat, longitude: pendingPin.lng });
    setSelectedKey(zonePinSelectionKey({ mode, key }));
    setPendingPin(null);
  }

  function save() {
    setError(null);
    const normalized = normalizeZoneGeoRules(geoRules);
    if (draftOnly) {
      onDraftConfirm?.(normalized);
      onClose();
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/zones/${encodeURIComponent(zone.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ geoRules: normalized })
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? t("zoneSaveFailed"));
        return;
      }
      onSaved(j.zone as ZoneSummary);
    });
  }

  function renderLocationRow(loc: ZoneCustomLocation, mode: "include" | "exclude") {
    const normalized = normalizeZoneCustomLocation(loc);
    if (!normalized) return null;
    const key = zoneLocationKey(normalized);
    const pin = zoneCustomLocationToPin(normalized, mode);
    const selectionKey = zonePinSelectionKey(pin);
    const isInclude = mode === "include";
    const accent = isInclude ? "#1877F2" : "#E41E3F";
    const isSelected = selectedKey === selectionKey;

    return (
      <li
        key={isInclude ? key : `ex-${key}`}
        ref={(el) => {
          listRefs.current[selectionKey] = el;
        }}
        onMouseEnter={() => setSelectedKey(selectionKey)}
        className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 text-xs transition-colors ${
          isSelected
            ? isInclude
              ? "border-[#1877F2]/50 bg-[#1877F2]/5"
              : "border-[#E41E3F]/50 bg-[#E41E3F]/5"
            : "border-[var(--border-color)] bg-[var(--surface-card)]"
        }`}
      >
        {!isInclude ? (
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#E41E3F]" />
        ) : null}
        <span
          className={`min-w-0 flex-1 text-[var(--text-main)] ${
            isSelected ? "font-bold" : "font-medium"
          }`}
        >
          {formatLocationLabel(normalized)}
        </span>
        <label className="flex items-center gap-1 text-[var(--text-dim)]">
          <RadiusKmField
            value={pin.radius}
            accent={accent}
            onFocus={() => setSelectedKey(selectionKey)}
            onChange={(radius) => {
              setSelectedKey(selectionKey);
              setGeoRules((prev) => updateZoneLocationRadius(prev, key, mode, radius));
            }}
          />
          <input
            type="range"
            min={1}
            max={70}
            value={pin.radius}
            onFocus={() => setSelectedKey(selectionKey)}
            onChange={(e) => {
              const radius = Number(e.target.value);
              setSelectedKey(selectionKey);
              setGeoRules((prev) => updateZoneLocationRadius(prev, key, mode, radius));
            }}
            className="w-24"
            style={{ accentColor: accent }}
          />
        </label>
        {isInclude ? (
          <button
            type="button"
            className="text-[var(--text-dimmer)] hover:text-[#E41E3F]"
            onClick={() => setGeoRules((prev) => excludeZoneLocation(prev, key))}
          >
            {t("zoneExcludeLocation")}
          </button>
        ) : (
          <button
            type="button"
            className="text-[var(--text-dimmer)] hover:text-[#1877F2]"
            onClick={() => setGeoRules((prev) => restoreZoneLocation(prev, key))}
          >
            {t("zoneRestoreLocation")}
          </button>
        )}
        <button
          type="button"
          className="text-[var(--text-dimmer)] hover:text-red-500"
          aria-label={t("zoneRemoveLocation")}
          onClick={() => setGeoRules((prev) => removeZoneLocation(prev, key, mode))}
        >
          ✕
        </button>
      </li>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg text-[var(--text-main)]">{zone.name}</h2>
          <p className="mt-1 text-xs text-[var(--text-dimmer)]">
            {t("zoneUpdatedAt", { date: formatUpdatedAt(zone.updatedAt, locale) })}
          </p>
        </div>
        <button type="button" className="ui-btn-secondary text-sm" onClick={onClose}>
          {t("close")}
        </button>
      </div>

      {zone.description ? (
        <p className="text-sm leading-relaxed text-[var(--text-dim)]">{zone.description}</p>
      ) : null}

      {zone.sourcePrompt ? (
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
            {t("zoneSourcePrompt")}
          </p>
          <p className="whitespace-pre-wrap rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-3 text-sm text-[var(--text-dim)]">
            {zone.sourcePrompt}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-dimmer)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1877F2]" />
            {t("zoneMapIncludeLegend")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#E41E3F]" />
            {t("zoneMapExcludeLegend")}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-dim)]">{t("zoneMapClickAddPrompt")}</p>

        <div className="relative">
          {mapReady ? (
            <ZoneGeoMapInner
              mapKey={zone.id}
              pins={mapPins}
              selectedKey={selectedKey}
              onMapClick={handleMapClick}
              onPinSelect={handlePinSelect}
              onPinHover={handlePinHover}
            />
          ) : (
            <div className="h-80 animate-pulse rounded-xl bg-[var(--surface-bg)]" />
          )}

          {pendingPin ? (
            <div className="absolute inset-0 z-[500] flex items-center justify-center rounded-xl bg-black/25 p-4">
              <div className="ui-card w-full max-w-sm space-y-3 p-4 shadow-lg">
                <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
                  {t("zonePinChoiceTitle")}
                </p>
                <p className="text-xs text-[var(--text-dim)]">
                  {t("zoneManualPinLabel", {
                    lat: pendingPin.lat.toFixed(4),
                    lng: pendingPin.lng.toFixed(4)
                  })}
                  {" · "}
                  {t("zonePinChoiceRadius", { radius: defaultRadius })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ui-btn-primary flex-1 text-xs"
                    onClick={() => confirmPendingPin("include")}
                  >
                    {t("zonePinChoiceInclude")}
                  </button>
                  <button
                    type="button"
                    className="ui-btn-secondary flex-1 border-[#E41E3F]/30 text-xs text-[#E41E3F]"
                    onClick={() => confirmPendingPin("exclude")}
                  >
                    {t("zonePinChoiceExclude")}
                  </button>
                  <button
                    type="button"
                    className="w-full text-xs text-[var(--text-dimmer)] underline"
                    onClick={() => setPendingPin(null)}
                  >
                    {t("close")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
            {t("zoneIncludedLocations")} ({included.length})
          </p>
          {included.length === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">{t("zoneNoIncludedLocations")}</p>
          ) : (
            <ul className="space-y-2">{included.map((loc) => renderLocationRow(loc, "include"))}</ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
            {t("zoneExcludedLocations")} ({excluded.length})
          </p>
          {excluded.length === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">{t("zoneNoExcludedLocations")}</p>
          ) : (
            <ul className="space-y-2">{excluded.map((loc) => renderLocationRow(loc, "exclude"))}</ul>
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {dirty || draftOnly ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-btn-brand" disabled={pending} onClick={save}>
            {pending
              ? t("zoneSaving")
              : draftOnly
                ? t("zoneConfirmDraft")
                : t("zoneSaveChanges")}
          </button>
          <button
            type="button"
            className="ui-btn-secondary"
            disabled={pending}
            onClick={() => {
              setGeoRules(normalizedZoneRules);
              setPendingPin(null);
              setSelectedKey(null);
            }}
          >
            {t("zoneDiscardChanges")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
