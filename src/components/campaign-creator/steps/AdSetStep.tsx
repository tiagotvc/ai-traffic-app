"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { MetaTargetingSelect } from "@/components/MetaTargetingSelect";
import { PersonaPicker } from "@/components/campaign-creator/PersonaPicker";
import { ZonePicker } from "@/components/campaign-creator/ZonePicker";
import { ZoneGeoReviewPanel } from "@/components/campaign-creator/ZoneGeoReviewPanel";
import { AudiencePicker } from "@/components/campaign-creator/AudiencePicker";
import { SavedTargetingPicker } from "@/components/campaign-creator/SavedTargetingPicker";
import { ImportAdsetConfigModal } from "@/components/campaign-creator/ImportAdsetConfigModal";
import { GeoRadiusMapPicker, type MapViewport } from "@/components/campaign-creator/GeoRadiusMapPicker";
import { PlacementsPanel } from "@/components/campaign-creator/PlacementsPanel";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { usePublishAssets } from "@/hooks/usePublishAssets";
import { applyImportedToAd, type ImportedAdConfig } from "@/lib/campaign-ad-import";
import { applyImportedToAdset } from "@/lib/campaign-adset-import";
import {
  getActiveAdset,
  defaultConversionEventForObjective,
  defaultAdItem,
  adsetsWithReuseCreativeCompatibility,
  isMapPinLocation,
  isMetaGeoLocation,
  resolveAdTargetAdsets,
  usesReusedMetaCreative
} from "@/lib/campaign-draft";
import type { AdSetDraftItem, DraftTargeting } from "@/lib/campaign-draft";
import { defaultScheduleStartLocal } from "@/lib/campaign-placements";

export function AdSetStep() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const locale = useLocale();
  const { payload, updatePayload, addAdsetMode } = useCampaignDraft();
  const { audiences, audiencesLoading, pixels, customConversions } = usePublishAssets(
    payload.clientSlug,
    payload.adAccountId
  );
  const adset = getActiveAdset(payload);
  const targeting = adset.targeting;
  const clientRequired = !payload.clientSlug;
  const dynamicCreativeLockedByReuse = payload.ads.some(
    (ad) =>
      usesReusedMetaCreative(ad) &&
      resolveAdTargetAdsets(payload, ad).some((s) => s.id === adset.id)
  );

  const [mapViewport, setMapViewport] = useState<MapViewport | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [commercialLocation, setCommercialLocation] = useState<{
    address: string | null;
    normalized: string | null;
    lat: number | null;
    lng: number | null;
  }>({ address: null, normalized: null, lat: null, lng: null });

  const metaGeoLocations = useMemo(
    () => targeting.locations.filter(isMetaGeoLocation),
    [targeting.locations]
  );

  useEffect(() => {
    if (!payload.clientSlug) {
      setCommercialLocation({ address: null, normalized: null, lat: null, lng: null });
      return;
    }

    function applySettings(s?: {
      commercialAddress?: string | null;
      commercialAddressNormalized?: string | null;
      commercialLatitude?: number | null;
      commercialLongitude?: number | null;
    }) {
      setCommercialLocation({
        address: s?.commercialAddress ?? null,
        normalized: s?.commercialAddressNormalized ?? null,
        lat: s?.commercialLatitude ?? null,
        lng: s?.commercialLongitude ?? null
      });
    }

    fetch(`/api/clients/${encodeURIComponent(payload.clientSlug)}/meta-settings`)
      .then((r) => r.json())
      .then(
        async (j: {
          settings?: {
            commercialAddress?: string | null;
            commercialAddressNormalized?: string | null;
            commercialLatitude?: number | null;
            commercialLongitude?: number | null;
          };
        }) => {
          const s = j.settings;
          const address = s?.commercialAddress?.trim();
          const needsGeocode =
            address &&
            (s?.commercialLatitude == null ||
              s?.commercialLongitude == null ||
              !s?.commercialAddressNormalized);

          if (needsGeocode) {
            const retry = await fetch(
              `/api/clients/${encodeURIComponent(payload.clientSlug)}/meta-settings`,
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ commercialAddress: address })
              }
            )
              .then((r) => r.json())
              .catch(() => null);
            if (retry?.settings) {
              applySettings(retry.settings);
              return;
            }
          }

          applySettings(s);
        }
      )
      .catch(() =>
        setCommercialLocation({ address: null, normalized: null, lat: null, lng: null })
      );
  }, [payload.clientSlug]);

  function centerOnCommercialAddress() {
    if (commercialLocation.lat != null && commercialLocation.lng != null) {
      setMapViewport({
        center: [commercialLocation.lat, commercialLocation.lng],
        zoom: 14
      });
      return;
    }
    setMapViewport(null);
  }

  const commercialCenterHint =
    !commercialLocation.address?.trim()
      ? t("commercialAddressMissing")
      : commercialLocation.lat == null
        ? t("commercialAddressGeocodeFailed")
        : null;

  useEffect(() => {
    if (adset.schedule.start) return;
    patchAdset({ schedule: { ...adset.schedule, start: defaultScheduleStartLocal() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adset.id]);

  useEffect(() => {
    if (!adset.pixelId || adset.conversionEvent) return;
    const suggested = defaultConversionEventForObjective(payload.objective);
    if (suggested) patchAdset({ conversionEvent: suggested });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adset.pixelId, adset.id, payload.objective]);

  function patchAdset(patch: Partial<typeof adset>) {
    updatePayload((p) => ({
      ...p,
      adsets: p.adsets.map((a) => (a.id === adset.id ? { ...a, ...patch } : a))
    }));
  }

  function patchTargeting(patch: Partial<DraftTargeting>) {
    patchAdset({ targeting: { ...targeting, ...patch } });
  }

  function selectAdset(id: string) {
    updatePayload({ activeAdsetId: id });
  }

  function removeAdset(adsetId: string) {
    if (payload.adsets.length <= 1 || addAdsetMode) return;
    updatePayload((p) => {
      const adsets = p.adsets.filter((a) => a.id !== adsetId);
      const fallbackAdsetId = adsets[0]?.id;
      if (!fallbackAdsetId) return p;
      const activeAdsetId =
        p.activeAdsetId === adsetId || !p.activeAdsetId ? fallbackAdsetId : p.activeAdsetId;
      const ads = p.ads.map((ad) => {
        if (ad.targetAdsetIds.includes("__all__")) return ad;
        const targets = ad.targetAdsetIds.filter((id) => id !== adsetId);
        if (targets.length > 0) return { ...ad, targetAdsetIds: targets };
        return { ...ad, targetAdsetIds: [activeAdsetId] };
      });
      const activeAdId = ads.some((a) => a.id === p.activeAdId) ? p.activeAdId : ads[0]?.id ?? p.activeAdId;
      return { ...p, adsets, activeAdsetId, ads, activeAdId };
    });
  }

  function handleImportAdset(result: {
    adset: Partial<AdSetDraftItem>;
    ads?: ImportedAdConfig[];
    adsetName: string;
  }) {
    updatePayload((p) => {
      const active = getActiveAdset(p);
      const nextAdset = applyImportedToAdset(active, result.adset);
      let adsets = p.adsets.map((a) => (a.id === active.id ? nextAdset : a));
      let ads = p.ads;
      let activeAdId = p.activeAdId;

      if (result.ads?.length) {
        const newAds = result.ads.map((imported) => {
          const shell = defaultAdItem(locale);
          const applied = applyImportedToAd(shell, imported, "all");
          return { ...applied, targetAdsetIds: [active.id] };
        });
        ads = [...p.ads, ...newAds];
        activeAdId = newAds[newAds.length - 1]!.id;
        let draft = { ...p, ads, adsets, activeAdId };
        for (const newAd of newAds) {
          adsets = adsetsWithReuseCreativeCompatibility(draft, newAd);
          draft = { ...draft, adsets };
        }
      }

      return { ...p, adsets, ads, activeAdId };
    });
  }

  return (
    <div className="space-y-4">
      {!payload.clientSlug ? (
        <p className="ui-alert-warning px-3 py-2 text-xs text-amber-800">
          {t("selectClientFirst")}
        </p>
      ) : null}

      {payload.adsets.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {payload.adsets.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => selectAdset(a.id)}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  adset.id === a.id
                    ? "bg-[rgba(124,58,237,0.1)] font-medium text-[var(--violet)]"
                    : "bg-[var(--surface-bg)] text-[var(--text-dim)]"
                }`}
              >
                {a.name || t("treeAdset")}
              </button>
              {!addAdsetMode ? (
                <button
                  type="button"
                  onClick={() => removeAdset(a.id)}
                  className="rounded-md px-1 py-0.5 text-xs text-[var(--text-dimmer)] hover:bg-red-50 hover:text-red-600"
                  title={t("removeAdset")}
                  aria-label={t("removeAdset")}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {addAdsetMode && payload.meta?.targetMetaCampaignId ? (
        <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-900">
          {t("addAdsetContext", { campaign: payload.campaign.name || payload.meta.targetMetaCampaignId })}
        </p>
      ) : null}

      {!addAdsetMode ? (
        <div className="relative">
          <button
            type="button"
            data-import-adset-trigger
            onClick={() => setImportOpen((v) => !v)}
            disabled={clientRequired || !payload.adAccountId}
            className={`ui-btn-secondary text-xs ${importOpen ? "ring-2 ring-violet-300" : ""}`}
          >
            {t("importAdsetConfig")}
          </button>
          <ImportAdsetConfigModal
            open={importOpen}
            inline
            onClose={() => setImportOpen(false)}
            clientSlug={payload.clientSlug}
            adAccountId={payload.adAccountId}
            defaultCampaignId={payload.meta?.targetMetaCampaignId}
            onImport={handleImportAdset}
          />
        </div>
      ) : null}

      <FormField label={t("adsetName")}>
        <input
          value={adset.name}
          onChange={(e) => patchAdset({ name: e.target.value })}
          className="ui-input"
          disabled={clientRequired}
        />
      </FormField>

      {payload.objective === "leads" || payload.objective === "sales" ? (
        <FormField label={t("conversionLocation")}>
          <select
            value={adset.conversionLocation}
            onChange={(e) =>
              patchAdset({
                conversionLocation: e.target.value as typeof adset.conversionLocation
              })
            }
            className="ui-select"
            disabled={clientRequired}
          >
            <option value="website_and_form">{t("convWebsiteAndForm")}</option>
            <option value="website">{t("convWebsite")}</option>
            <option value="instant_form">{t("convInstantForm")}</option>
            <option value="messaging">{t("convMessaging")}</option>
            <option value="calls">{t("convCalls")}</option>
            <option value="app">{t("convApp")}</option>
          </select>
        </FormField>
      ) : null}

      {adset.conversionLocation === "messaging" ? (
        <FormField label={t("messagingChannels")}>
          <div className="flex flex-wrap gap-3">
            {(["whatsapp", "messenger", "instagram"] as const).map((ch) => (
              <label key={ch} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={adset.messagingChannels.includes(ch)}
                  disabled={clientRequired}
                  onChange={() => {
                    const next = adset.messagingChannels.includes(ch)
                      ? adset.messagingChannels.filter((c) => c !== ch)
                      : [...adset.messagingChannels, ch];
                    patchAdset({ messagingChannels: next });
                  }}
                />
                {ch}
              </label>
            ))}
          </div>
        </FormField>
      ) : null}

      {(adset.conversionLocation === "website" ||
        adset.conversionLocation === "website_and_form" ||
        payload.objective === "sales") &&
      pixels.length > 0 ? (
        <div className="ui-card grid gap-3 p-4 sm:grid-cols-2">
          <FormField label={tAds("pixel")}>
            <select
              value={adset.pixelId ?? ""}
              onChange={(e) => patchAdset({ pixelId: e.target.value || null })}
              className="ui-select"
              disabled={clientRequired}
            >
              <option value="">{tAds("pixelNone")}</option>
              {pixels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("conversionEvent")}>
            <select
              value={adset.conversionEvent}
              onChange={(e) => patchAdset({ conversionEvent: e.target.value })}
              className="ui-select"
              disabled={clientRequired}
            >
              <option value="">{t("conversionEventSelect")}</option>
              {customConversions
                .filter((c) => c.id.startsWith("std:"))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              {customConversions.some((c) => !c.id.startsWith("std:")) ? (
                <optgroup label={t("accountCustomConversions")}>
                  {customConversions
                    .filter((c) => !c.id.startsWith("std:"))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                </optgroup>
              ) : null}
            </select>
          </FormField>
        </div>
      ) : null}

      {dynamicCreativeLockedByReuse ? (
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="font-medium text-amber-900 dark:text-amber-100">{t("dynamicCreativeReuseTitle")}</p>
          <p className="mt-1 text-[var(--text-dim)]">{t("dynamicCreativeReuseBody")}</p>
          <p className="mt-2 text-[10px] text-[var(--text-dimmer)]">{t("dynamicCreativeReuseComingSoon")}</p>
        </div>
      ) : (
        <label className="flex items-start gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={adset.dynamicCreative}
            onChange={(e) => patchAdset({ dynamicCreative: e.target.checked })}
            disabled={clientRequired}
            className="mt-0.5 accent-violet-600"
          />
          <span>
            <span className="font-medium text-[var(--text-main)]">{t("dynamicCreativeLabel")}</span>
            <span className="mt-0.5 block text-xs text-[var(--text-dim)]">{t("dynamicCreativeHint")}</span>
          </span>
        </label>
      )}

      <div className="ui-card space-y-4 p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{tAds("audienceTitle")}</h3>

        <div className="flex flex-wrap gap-2">
          {(["compiler", "meta_saved", "advanced"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={clientRequired}
              onClick={() => patchAdset({ targetingMode: mode })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                (adset.targetingMode ?? "compiler") === mode
                  ? "bg-[rgba(245,166,35,0.15)] text-[var(--text-main)]"
                  : "bg-[var(--surface-bg)] text-[var(--text-dim)]"
              }`}
            >
              {t(`targetingMode_${mode}`)}
            </button>
          ))}
        </div>

        {(adset.targetingMode ?? "compiler") === "compiler" ? (
          <div className="space-y-4">
            <PersonaPicker
              value={adset.personaId}
              clientSlug={payload.clientSlug}
              adAccountId={payload.adAccountId}
              disabled={clientRequired}
              onChange={(personaId) => patchAdset({ personaId })}
            />
            <ZonePicker
              value={adset.zoneId}
              disabled={clientRequired}
              onChange={(zoneId) => patchAdset({ zoneId })}
            />
            <ZoneGeoReviewPanel zoneId={adset.zoneId} />
            <details className="rounded-xl border border-[var(--border-color)] p-3">
              <summary className="cursor-pointer text-xs font-medium text-[var(--text-main)]">
                {t("metaRefineOptional")}
              </summary>
              <div className="mt-3">
                <AudiencePicker
                  audiences={audiences}
                  loading={audiencesLoading}
                  adAccountId={payload.adAccountId}
                  includeIds={targeting.customAudienceIds}
                  excludeIds={targeting.excludedAudienceIds}
                  onChangeInclude={(customAudienceIds) => patchTargeting({ customAudienceIds })}
                  onChangeExclude={(excludedAudienceIds) => patchTargeting({ excludedAudienceIds })}
                  disabled={clientRequired}
                />
              </div>
            </details>
          </div>
        ) : null}

        {(adset.targetingMode ?? "compiler") === "meta_saved" ? (
          <div
            className="space-y-3 rounded-xl border p-3"
            style={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.04)" }}
          >
            <p className="text-xs font-medium" style={{ color: "#a78bfa" }}>
              {t("metaSavedFeatureLabel")}
            </p>
            <SavedTargetingPicker
              clientSlug={payload.clientSlug}
              adAccountId={payload.adAccountId}
              disabled={clientRequired}
              onApply={(next, audienceName, audienceId) => {
                patchAdset({
                  targetingMode: "meta_saved",
                  metaSavedAudienceId: audienceId ?? null,
                  targeting: next
                });
                if (!adset.name.trim() || adset.name.startsWith("Novo conjunto") || adset.name.startsWith("New Ad Set")) {
                  patchAdset({ name: audienceName.slice(0, 120) });
                }
              }}
            />
            <AudiencePicker
              audiences={audiences}
              loading={audiencesLoading}
              adAccountId={payload.adAccountId}
              includeIds={targeting.customAudienceIds}
              excludeIds={targeting.excludedAudienceIds}
              onChangeInclude={(customAudienceIds) => patchTargeting({ customAudienceIds })}
              onChangeExclude={(excludedAudienceIds) => patchTargeting({ excludedAudienceIds })}
              disabled={clientRequired}
            />
            <ZonePicker
              value={adset.zoneId}
              disabled={clientRequired}
              onChange={(zoneId) => patchAdset({ zoneId })}
            />
            <ZoneGeoReviewPanel zoneId={adset.zoneId} />
          </div>
        ) : null}

        {(adset.targetingMode ?? "compiler") === "advanced" ? (
        <div className="space-y-4">
        <AudiencePicker
          audiences={audiences}
          loading={audiencesLoading}
          adAccountId={payload.adAccountId}
          includeIds={targeting.customAudienceIds}
          excludeIds={targeting.excludedAudienceIds}
          onChangeInclude={(customAudienceIds) => patchTargeting({ customAudienceIds })}
          onChangeExclude={(excludedAudienceIds) => patchTargeting({ excludedAudienceIds })}
          disabled={clientRequired}
        />

        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
          {t("audienceOrDivider")}
        </p>

        <div className="space-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-3">
          <p className="text-xs font-semibold text-[var(--text-main)]">{t("metaGeoSectionTitle")}</p>
          <p className="text-[11px] text-[var(--text-dim)]">{t("metaGeoSectionHint")}</p>
          <FormField label={tAds("locations")}>
            <MetaTargetingSelect
              type="geo"
              placeholder={tAds("locationsPlaceholder")}
              selected={metaGeoLocations}
              onAdd={(item) =>
                patchTargeting({
                  locations: [
                    ...targeting.locations,
                    {
                      ...item,
                      meta: {
                        type: item.meta?.type ?? "city",
                        countryCode: item.meta?.countryCode,
                        kind: item.meta?.kind,
                        radius: item.meta?.type === "city" || item.meta?.type === "region" ? 10 : undefined,
                        distanceUnit:
                          item.meta?.type === "city" || item.meta?.type === "region"
                            ? "kilometer"
                            : undefined
                      }
                    }
                  ]
                })
              }
              onRemove={(value) =>
                patchTargeting({
                  locations: targeting.locations.filter((p) => p.value !== value)
                })
              }
              disabled={clientRequired}
            />
          </FormField>
        </div>

        <GeoRadiusMapPicker
          pins={targeting.locations}
          onAdd={(item) => patchTargeting({ locations: [...targeting.locations, item] })}
          onRemove={(value) =>
            patchTargeting({ locations: targeting.locations.filter((p) => p.value !== value) })
          }
          onUpdateRadius={(value, radius) =>
            patchTargeting({
              locations: targeting.locations.map((l) =>
                l.value === value && isMapPinLocation(l)
                  ? {
                      ...l,
                      meta: {
                        ...l.meta,
                        type: "custom_location",
                        radius,
                        distanceUnit: "kilometer"
                      }
                    }
                  : l
              )
            })
          }
          viewport={mapViewport}
          commercialMarker={
            commercialLocation.lat != null && commercialLocation.lng != null
              ? {
                  lat: commercialLocation.lat,
                  lng: commercialLocation.lng,
                  label: commercialLocation.normalized ?? commercialLocation.address ?? undefined
                }
              : null
          }
          onCenterCommercial={centerOnCommercialAddress}
          centerCommercialDisabled={
            clientRequired ||
            commercialLocation.lat == null ||
            commercialLocation.lng == null
          }
          centerCommercialHint={commercialCenterHint}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FormField label={tAds("ageMin")}>
            <input
              type="number"
              min={13}
              max={65}
              value={targeting.ageMin}
              onChange={(e) => patchTargeting({ ageMin: Number(e.target.value) })}
              className="ui-input"
              disabled={clientRequired}
            />
          </FormField>
          <FormField label={tAds("ageMax")}>
            <input
              type="number"
              min={13}
              max={65}
              value={targeting.ageMax}
              onChange={(e) => patchTargeting({ ageMax: Number(e.target.value) })}
              className="ui-input"
              disabled={clientRequired}
            />
          </FormField>
          <FormField label={tAds("gender")}>
            <select
              value={targeting.gender}
              onChange={(e) =>
                patchTargeting({ gender: e.target.value as DraftTargeting["gender"] })
              }
              className="ui-select"
              disabled={clientRequired}
            >
              <option value="all">{tAds("genderAll")}</option>
              <option value="male">{tAds("genderMale")}</option>
              <option value="female">{tAds("genderFemale")}</option>
            </select>
          </FormField>
        </div>
        <FormField label={tAds("interests")}>
          <MetaTargetingSelect
            type="interest"
            placeholder={tAds("interestsPlaceholder")}
            selected={targeting.interests}
            onAdd={(item) => patchTargeting({ interests: [...targeting.interests, item] })}
            onRemove={(value) =>
              patchTargeting({ interests: targeting.interests.filter((p) => p.value !== value) })
            }
          />
        </FormField>
        <FormField label={t("targetingLocales")}>
          <MetaTargetingSelect
            type="locale"
            placeholder={t("targetingLocalesPlaceholder")}
            selected={targeting.locales}
            onAdd={(item) => patchTargeting({ locales: [...targeting.locales, item] })}
            onRemove={(value) =>
              patchTargeting({ locales: targeting.locales.filter((p) => p.value !== value) })
            }
          />
        </FormField>
        <FormField label={t("targetingBehaviors")}>
          <MetaTargetingSelect
            type="behavior"
            placeholder={t("targetingBehaviorsPlaceholder")}
            selected={targeting.detailedGroups.flatMap((g) =>
              g.items.filter((i) => i.meta?.kind === "behavior")
            )}
            onAdd={(item) => {
              const groups = [...targeting.detailedGroups];
              const idx = groups.findIndex((g) => g.items.some((i) => i.meta?.kind === "behavior"));
              if (idx >= 0) groups[idx] = { items: [...groups[idx]!.items, item] };
              else groups.push({ items: [item] });
              patchTargeting({ detailedGroups: groups });
            }}
            onRemove={(value) =>
              patchTargeting({
                detailedGroups: targeting.detailedGroups
                  .map((g) => ({ items: g.items.filter((i) => i.value !== value) }))
                  .filter((g) => g.items.length)
              })
            }
          />
        </FormField>
        <label className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
          <input
            type="checkbox"
            checked={targeting.advantageAudience}
            onChange={(e) => patchTargeting({ advantageAudience: e.target.checked })}
            disabled={clientRequired}
            className="accent-violet-600"
          />
          {t("advantageAudience")}
        </label>
        <div className="space-y-2 rounded-lg border border-dashed border-[var(--border-color)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[var(--text-dim)]">{t("detailedTargetingTitle")}</p>
            <button
              type="button"
              disabled={clientRequired}
              onClick={() =>
                patchTargeting({
                  detailedGroups: [...targeting.detailedGroups, { items: [] }]
                })
              }
              className="text-[11px] text-[var(--violet)] hover:underline"
            >
              {t("detailedTargetingAddGroup")}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-dim)]">{t("detailedTargetingHint")}</p>
          {targeting.detailedGroups.map((group, idx) => (
            <div key={idx} className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-thead)]/80 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-medium text-[var(--text-dim)]">
                  {t("detailedTargetingGroup", { n: idx + 1 })}
                </span>
                <button
                  type="button"
                  disabled={clientRequired}
                  onClick={() =>
                    patchTargeting({
                      detailedGroups: targeting.detailedGroups.filter((_, i) => i !== idx)
                    })
                  }
                  className="text-[10px] text-red-500 hover:underline"
                >
                  {t("detailedTargetingRemoveGroup")}
                </button>
              </div>
              <MetaTargetingSelect
                type="interest"
                placeholder={tAds("interestsPlaceholder")}
                selected={group.items.filter((i) => (i.meta?.kind ?? "interest") === "interest")}
                onAdd={(item) => {
                  const groups = [...targeting.detailedGroups];
                  const g = groups[idx]!;
                  groups[idx] = { items: [...g.items, { ...item, meta: { ...item.meta, kind: "interest" } }] };
                  patchTargeting({ detailedGroups: groups, interests: [] });
                }}
                onRemove={(value) => {
                  const groups = targeting.detailedGroups.map((g, i) =>
                    i === idx ? { items: g.items.filter((x) => x.value !== value) } : g
                  );
                  patchTargeting({ detailedGroups: groups.filter((g) => g.items.length) });
                }}
              />
            </div>
          ))}
        </div>
        <FormField label={t("targetingDemographics")}>
          <MetaTargetingSelect
            type="demographic"
            placeholder={t("targetingDemographicsPlaceholder")}
            selected={targeting.detailedGroups.flatMap((g) =>
              g.items.filter((i) => i.meta?.kind === "demographic")
            )}
            onAdd={(item) => {
              const groups = [...targeting.detailedGroups];
              const idx = groups.findIndex((g) => g.items.some((i) => i.meta?.kind === "demographic"));
              const tagged = { ...item, meta: { ...item.meta, kind: "demographic" as const } };
              if (idx >= 0) groups[idx] = { items: [...groups[idx]!.items, tagged] };
              else groups.push({ items: [tagged] });
              patchTargeting({ detailedGroups: groups });
            }}
            onRemove={(value) =>
              patchTargeting({
                detailedGroups: targeting.detailedGroups
                  .map((g) => ({ items: g.items.filter((i) => i.value !== value) }))
                  .filter((g) => g.items.length)
              })
            }
          />
        </FormField>
        </div>
        ) : null}
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("scheduleSection")}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label={t("scheduleStart")}>
            <input
              type="datetime-local"
              value={adset.schedule.start ?? ""}
              onChange={(e) =>
                patchAdset({
                  schedule: { ...adset.schedule, start: e.target.value || null }
                })
              }
              className="ui-input"
              disabled={clientRequired}
            />
          </FormField>
          <FormField label={t("scheduleEnd")}>
            <input
              type="datetime-local"
              value={adset.schedule.end ?? ""}
              onChange={(e) =>
                patchAdset({
                  schedule: { ...adset.schedule, end: e.target.value || null }
                })
              }
              className="ui-input"
              disabled={clientRequired}
            />
          </FormField>
        </div>
      </div>

      <FormField label={t("placements")}>
        <PlacementsPanel
          value={adset.placements}
          onChange={(placements) => patchAdset({ placements })}
          disabled={clientRequired}
        />
      </FormField>
    </div>
  );
}
