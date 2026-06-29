"use client";

import dynamic from "next/dynamic";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, useTransition } from "react";
import { Hash, MapPin, Tag } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  CreatorAiPreviewSection,
  CreatorAiPromptField
} from "@/components/campaign-creator/CreatorAiModalParts";
import { zoneSectionShowsField } from "@/components/audiences/create/zone-creator-steps";
import type { ZoneCreatorSectionKey } from "@/components/audiences/create/zone-creator-steps";
import { FilterTextField } from "@/components/FilterTextField";
import type { ZoneGeoRules } from "@/db/entities/UserZone";
import { normalizeZoneGeoRules, zoneGeoRulesToMapPins } from "@/lib/zone-geo-shared";

const ZoneGeoMapInner = dynamic(
  () => import("@/components/audiences/ZoneGeoMapInner").then((m) => m.ZoneGeoMapInner),
  { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-xl bg-[var(--surface-bg)]" /> }
);

type ZonePreview = {
  zoneName: string;
  summary: string;
  places: Array<{ label: string; city?: string; state?: string; radiusKm?: number }>;
};

export type AiZoneFormActionState = {
  canSave: boolean;
  canClear: boolean;
  pending: boolean;
  promptReady: boolean;
  hasPreview: boolean;
  hasGeoRules: boolean;
  /** Para o Geo Scientist (Orion Brain). */
  briefing?: string;
  region?: string;
  places?: string[];
  geoLocations?: { label?: string; latitude: number; longitude: number; radius: number }[];
};

export type AiZoneFormHandle = {
  reset: () => void;
  runPreview: () => void;
  geocode: () => void;
  save: () => void;
};

type Props = {
  onClose: () => void;
  onSaved: () => void;
  embedded?: boolean;
  shellMode?: boolean;
  compactLayout?: boolean;
  zoneSection?: ZoneCreatorSectionKey;
  onActionStateChange?: (state: AiZoneFormActionState) => void;
};

export const AiZoneForm = forwardRef<AiZoneFormHandle, Props>(function AiZoneForm(
  {
    onClose,
    onSaved,
    embedded = false,
    shellMode = false,
    compactLayout = false,
    zoneSection,
    onActionStateChange
  },
  ref
) {
  const t = useTranslations("audiences");
  const tm = useTranslations("audiencesMisc");
  const [prompt, setPrompt] = useState("");
  const [defaultRadiusKm, setDefaultRadiusKm] = useState(3);
  const [provider, setProvider] = useState<"gemini" | "claude">("gemini");
  const [preview, setPreview] = useState<ZonePreview | null>(null);
  const [geoRules, setGeoRules] = useState<ZoneGeoRules | null>(null);
  const [resolvedName, setResolvedName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [providers, setProviders] = useState({ gemini: true, claude: false });

  const show = (field: Parameters<typeof zoneSectionShowsField>[1]) =>
    zoneSectionShowsField(zoneSection, field);

  const mapPins = useMemo(
    () => (geoRules ? zoneGeoRulesToMapPins(normalizeZoneGeoRules(geoRules)) : []),
    [geoRules]
  );

  useEffect(() => {
    fetch("/api/zones/ai-generate")
      .then((r) => r.json())
      .then((j: { providers?: { gemini: boolean; claude: boolean } }) => {
        if (j.providers) {
          setProviders(j.providers);
          if (j.providers.gemini) setProvider("gemini");
          else if (j.providers.claude) setProvider("claude");
        }
      })
      .catch(() => {});
  }, []);

  function resetForm() {
    setPrompt("");
    setDefaultRadiusKm(3);
    setPreview(null);
    setGeoRules(null);
    setResolvedName("");
    setError(null);
  }

  function runPreview() {
    if (!prompt.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/zones/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "preview", prompt, provider, defaultRadiusKm })
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? tm("errorAi"));
        return;
      }
      setPreview(j.preview);
      setGeoRules(null);
      setResolvedName("");
    });
  }

  function geocode() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/zones/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "geocode", prompt, provider, defaultRadiusKm, preview })
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? tm("errorGeocoding"));
        return;
      }
      setGeoRules(j.result.geoRules);
      setResolvedName(j.result.name ?? preview.zoneName ?? "");
    });
  }

  function save() {
    if (!geoRules) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/zones/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "save",
          name: resolvedName.trim() || preview?.zoneName || tm("newZoneDefaultName"),
          description: preview?.summary,
          geoRules,
          sourcePrompt: prompt
        })
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? tm("errorSaving"));
        return;
      }
      onSaved();
    });
  }

  const promptReady = prompt.trim().length >= 3;
  const hasPreview = Boolean(preview);
  const hasGeoRules = Boolean(geoRules?.customLocations?.length);
  const canSave = hasGeoRules && !pending;

  useImperativeHandle(ref, () => ({
    reset: resetForm,
    runPreview,
    geocode,
    save
  }));

  const previewPlaces = preview?.places ?? [];
  const placeLabels = previewPlaces.map((p) => p.label);
  const previewRegion = previewPlaces.find((p) => p.city || p.state)
    ? [previewPlaces[0]?.city, previewPlaces[0]?.state].filter(Boolean).join(" - ")
    : undefined;

  useEffect(() => {
    onActionStateChange?.({
      canSave,
      canClear: Boolean(prompt || preview || geoRules),
      pending,
      promptReady,
      hasPreview,
      hasGeoRules,
      briefing: prompt.trim() || undefined,
      region: previewRegion,
      places: placeLabels.length ? placeLabels : undefined,
      geoLocations: geoRules?.customLocations?.length
        ? geoRules.customLocations.map((l) => ({
            label: l.label,
            latitude: l.latitude,
            longitude: l.longitude,
            radius: l.radius
          }))
        : undefined
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, prompt, preview, geoRules, pending, promptReady, hasPreview, hasGeoRules, onActionStateChange]);

  return (
    <div className="space-y-4">
      {!embedded && !shellMode ? (
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-[var(--text-main)]">{t("newZone")}</h2>
          <button type="button" className="ui-btn-secondary text-sm" onClick={onClose}>
            {t("close")}
          </button>
        </div>
      ) : null}

      {show("prompt") || show("radius") ? (
        <section className="campaign-creator-card space-y-4">
          {compactLayout && show("prompt") && show("radius") ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,17.5rem)] lg:items-start lg:gap-6">
              <CreatorAiPromptField
                icon={<MapPin size={14} />}
                label={t("zonePromptLabel")}
                value={prompt}
                onChange={(value) => {
                  setPrompt(value);
                  setPreview(null);
                  setGeoRules(null);
                  setResolvedName("");
                }}
                placeholder={t("zonePromptPlaceholder")}
                rows={4}
                maxLength={200}
              />
              <div className="space-y-1.5 lg:pt-9">
                <FilterTextField
                  creatorField
                  icon={<Hash size={13} />}
                  label={t("zoneRadiusLabel")}
                  type="number"
                  min={1}
                  max={70}
                  value={String(defaultRadiusKm)}
                  onChange={(v) => {
                    const next = Number(v);
                    if (!Number.isFinite(next)) return;
                    setDefaultRadiusKm(Math.min(70, Math.max(1, Math.round(next))));
                    setGeoRules(null);
                  }}
                  suffix={<span className="text-[10px] text-[var(--text-dimmer)]">km</span>}
                />
                <p className="text-[10px] leading-relaxed text-[var(--text-dimmer)]">{t("zoneRadiusHint")}</p>
              </div>
            </div>
          ) : (
            <>
              {show("prompt") ? (
                <CreatorAiPromptField
                  icon={<MapPin size={14} />}
                  label={t("zonePromptLabel")}
                  value={prompt}
                  onChange={(value) => {
                    setPrompt(value);
                    setPreview(null);
                    setGeoRules(null);
                    setResolvedName("");
                  }}
                  placeholder={t("zonePromptPlaceholder")}
                  rows={4}
                  maxLength={compactLayout ? 200 : 400}
                  hint={compactLayout ? undefined : t("zonePlacesLimitHint")}
                />
              ) : null}

              {show("radius") ? (
                <div className={compactLayout ? "space-y-1" : "max-w-xs space-y-1"}>
                  <FilterTextField
                    creatorField
                    icon={<Hash size={13} />}
                    label={t("zoneRadiusLabel")}
                    type="number"
                    min={1}
                    max={70}
                    value={String(defaultRadiusKm)}
                    onChange={(v) => {
                      const next = Number(v);
                      if (!Number.isFinite(next)) return;
                      setDefaultRadiusKm(Math.min(70, Math.max(1, Math.round(next))));
                      setGeoRules(null);
                    }}
                    suffix={<span className="text-[10px] text-[var(--text-dimmer)]">km</span>}
                  />
                  <p className="text-[10px] text-[var(--text-dimmer)]">{t("zoneRadiusHint")}</p>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {show("preview") && !preview ? (
        <CreatorAiPreviewSection
          title={t("previewZone")}
          hint={t("zonePlacesLimitHint")}
          action={
            <button
              type="button"
              className="ui-btn-accent inline-flex w-full items-center justify-center gap-1.5 text-sm font-heading font-semibold sm:w-auto"
              disabled={pending || !promptReady}
              onClick={runPreview}
            >
              {pending ? t("generating") : t("previewZone")}
            </button>
          }
        />
      ) : null}

      {show("preview") && preview ? (
        <div className="campaign-creator-card space-y-3 p-4 text-sm">
          <div>
            <p className="font-heading text-base font-semibold text-[var(--text-main)]">{preview.zoneName}</p>
            <p className="mt-1 text-[var(--text-dim)]">{preview.summary}</p>
          </div>
          <ul className="list-inside list-disc text-[var(--text-dimmer)]">
            {preview.places.map((p) => (
              <li key={p.label}>
                {p.label}
                {p.radiusKm != null ? ` (${p.radiusKm} km)` : ` (${defaultRadiusKm} km)`}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[var(--text-dimmer)]">{t("zonePlacesLimitHint")}</p>
        </div>
      ) : null}

      {show("geocode") && !compactLayout ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-btn-accent inline-flex items-center justify-center gap-1.5 text-sm font-heading font-semibold"
            disabled={pending || !preview}
            onClick={geocode}
          >
            {pending ? t("generating") : t("geocodeZone")}
          </button>
          {hasGeoRules ? (
            <p className="text-sm text-[var(--text-dim)]">
              {t("zonePinCount", { count: geoRules!.customLocations!.length })}
            </p>
          ) : null}
        </div>
      ) : null}

      {show("name") && hasGeoRules ? (
        <section className="campaign-creator-card space-y-3">
          <FilterTextField
            creatorField
            icon={<Tag size={13} />}
            label={t("zoneDetailsTitle")}
            value={resolvedName}
            onChange={setResolvedName}
            placeholder={preview?.zoneName ?? tm("newZoneDefaultName")}
          />
          {preview?.summary ? (
            <p className="text-[11px] leading-relaxed text-[var(--text-dimmer)]">{preview.summary}</p>
          ) : null}
        </section>
      ) : null}

      {show("map") && hasGeoRules ? (
        <section className="campaign-creator-card space-y-3">
          <p className="campaign-creator-orion-section-label">{t("zoneSectionReviewTitle")}</p>
          <div className="h-56 overflow-hidden rounded-xl border border-[var(--creator-card-border,var(--border-color))] sm:h-72">
            <ZoneGeoMapInner pins={mapPins} mapKey={`zone-draft-${mapPins.length}`} />
          </div>
          <p className="text-[11px] text-[var(--text-dimmer)]">
            {t("zonePinCount", { count: mapPins.length })}
          </p>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!shellMode ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={compactLayout ? "ui-btn-accent font-heading text-sm font-semibold" : "ui-btn-secondary"}
            disabled={pending || !promptReady}
            onClick={runPreview}
          >
            {pending ? t("generating") : t("previewZone")}
          </button>
          <button
            type="button"
            className="ui-btn-secondary"
            disabled={pending || !preview}
            onClick={geocode}
          >
            {t("geocodeZone")}
          </button>
          <button
            type="button"
            className="ui-btn-brand"
            disabled={pending || !geoRules}
            onClick={save}
          >
            {t("saveZone")}
          </button>
        </div>
      ) : null}
    </div>
  );
});
