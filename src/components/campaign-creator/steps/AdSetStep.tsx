"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bookmark, CalendarDays, SlidersHorizontal, Users } from "lucide-react";

import { PersonaPicker } from "@/components/campaign-creator/PersonaPicker";
import { AdvancedTargetingPanel } from "@/components/campaign-creator/AdvancedTargetingPanel";
import { ZonePicker } from "@/components/campaign-creator/ZonePicker";
import { CustomAudiencesModal } from "@/components/campaign-creator/CustomAudiencesModal";
import { SavedTargetingPicker } from "@/components/campaign-creator/SavedTargetingPicker";
import { ImportAdsetConfigModal } from "@/components/campaign-creator/ImportAdsetConfigModal";
import type { MapViewport } from "@/components/campaign-creator/GeoRadiusMapPicker";
import { PlacementsPanel } from "@/components/campaign-creator/PlacementsPanel";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { FormSelect, type FormSelectOption } from "@/components/ui/FormSelect";
import { usePublishAssets } from "@/hooks/usePublishAssets";
import { applyImportedToAd, type ImportedAdConfig } from "@/lib/campaign-ad-import";
import { applyImportedToAdset } from "@/lib/campaign-adset-import";
import { isDefaultAdsetName } from "@/lib/campaign-draft-i18n";
import {
  getActiveAdset,
  defaultConversionEventForObjective,
  defaultAdItem,
  adsetsWithReuseCreativeCompatibility,
  isMetaGeoLocation,
  resolveAdTargetAdsets,
  usesReusedMetaCreative
} from "@/lib/campaign-draft";
import type { AdSetDraftItem, DraftTargeting } from "@/lib/campaign-draft";
import { defaultScheduleStartLocal } from "@/lib/campaign-placements";
import { WizardAccordionSection } from "@/uxpilot-ui/adapters/ux-wizard-primitives";
import { DsChoiceCard } from "@/design-system/components/DsChoiceCard";
import { cn } from "@/lib/cn";

type AdSetView = "compiler" | "meta_saved" | "advanced" | "schedule";

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
  const [customAudiencesOpen, setCustomAudiencesOpen] = useState(false);
  const [activeView, setActiveView] = useState<AdSetView>("compiler");
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

  const conversionLocationOptions = useMemo(
    (): FormSelectOption[] => [
      { value: "website_and_form", label: t("convWebsiteAndForm") },
      { value: "website", label: t("convWebsite") },
      { value: "instant_form", label: t("convInstantForm") },
      { value: "messaging", label: t("convMessaging") },
      { value: "calls", label: t("convCalls") },
      { value: "app", label: t("convApp") }
    ],
    [t]
  );

  const pixelOptions = useMemo(
    (): FormSelectOption[] => pixels.map((p) => ({ value: p.id, label: p.name })),
    [pixels]
  );

  const conversionEventOptions = useMemo((): FormSelectOption[] => {
    const std = customConversions
      .filter((c) => c.id.startsWith("std:"))
      .map((c) => ({ value: c.id, label: c.label }));
    const custom = customConversions
      .filter((c) => !c.id.startsWith("std:"))
      .map((c) => ({
        value: c.id,
        label: c.label,
        hint: t("accountCustomConversions")
      }));
    return [...std, ...custom];
  }, [customConversions, t]);

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

  const targetingMode = adset.targetingMode ?? "compiler";
  const customAudienceCount =
    targeting.customAudienceIds.length + targeting.excludedAudienceIds.length;

  function customAudiencesButton(label: string) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={clientRequired}
          onClick={() => setCustomAudiencesOpen(true)}
          className="ui-btn-secondary-accent inline-flex items-center gap-2 px-3 py-1.5 text-xs"
        >
          {label}
          {customAudienceCount > 0 ? (
            <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
              {customAudienceCount}
            </span>
          ) : null}
        </button>
        {customAudienceCount > 0 ? (
          <span className="text-[10px] text-[var(--text-dimmer)]">
            {t("customAudiencesIncludedLegend", { count: customAudienceCount })}
          </span>
        ) : null}
      </div>
    );
  }

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

  function selectView(view: AdSetView) {
    setActiveView(view);
    if (view === "compiler") patchAdset({ targetingMode: "compiler" });
    else if (view === "meta_saved") patchAdset({ targetingMode: "meta_saved" });
    else if (view === "advanced") patchAdset({ targetingMode: "advanced" });
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

  function adsetSetupAccordion() {
    return (
      <WizardAccordionSection title={t("adsetSub_basics")} hint={t("adsetSection_setup_hint")} defaultOpen={false}>
        <div className="space-y-4">
          {!addAdsetMode ? (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              disabled={clientRequired || !payload.adAccountId}
              className="ui-btn-secondary text-xs"
            >
              {t("importAdsetConfig")}
            </button>
          ) : null}

          <FormField label={t("adsetName")}>
            <input
              value={adset.name}
              onChange={(e) => patchAdset({ name: e.target.value })}
              placeholder={t("adsetNamePlaceholder")}
              className="ui-input border-[var(--border-hover)] shadow-sm"
              disabled={clientRequired}
            />
          </FormField>

          {payload.objective === "leads" || payload.objective === "sales" ? (
            <FormField label={t("conversionLocation")}>
              <FormSelect
                value={adset.conversionLocation}
                onChange={(v) =>
                  patchAdset({
                    conversionLocation: v as typeof adset.conversionLocation
                  })
                }
                placeholder={t("conversionLocation")}
                options={conversionLocationOptions}
                clearable={false}
                disabled={clientRequired}
              />
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
                <FormSelect
                  value={adset.pixelId ?? ""}
                  onChange={(v) => patchAdset({ pixelId: v || null })}
                  placeholder={tAds("pixelNone")}
                  options={pixelOptions}
                  disabled={clientRequired}
                />
              </FormField>
              <FormField label={t("conversionEvent")}>
                <FormSelect
                  value={adset.conversionEvent}
                  onChange={(v) => patchAdset({ conversionEvent: v })}
                  placeholder={t("conversionEventSelect")}
                  options={conversionEventOptions}
                  disabled={clientRequired}
                />
              </FormField>
            </div>
          ) : null}

          {dynamicCreativeLockedByReuse ? (
            <div className="ui-alert-warning p-3 text-xs">
              <p className="font-medium">{t("dynamicCreativeReuseTitle")}</p>
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
                className="mt-0.5 accent-[var(--ui-accent)]"
              />
              <span>
                <span className="font-medium text-[var(--text-main)]">{t("dynamicCreativeLabel")}</span>
                <span className="mt-0.5 block text-xs text-[var(--text-dim)]">{t("dynamicCreativeHint")}</span>
              </span>
            </label>
          )}
        </div>
      </WizardAccordionSection>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 bg-[var(--surface-bg)]">
        {!payload.clientSlug ? (
          <p className="ui-alert-warning px-3 py-2 text-xs">{t("selectClientFirst")}</p>
        ) : null}

        {payload.adsets.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {payload.adsets.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => selectAdset(a.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs transition",
                    adset.id === a.id
                      ? "border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] font-medium text-[var(--ui-accent)]"
                      : "border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-dim)]"
                  )}
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
          <p className="ui-alert-info px-3 py-2 text-xs">{t("addAdsetContext", { campaign: payload.campaign.name || payload.meta.targetMetaCampaignId })}</p>
        ) : null}

        <div>
          <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{t("treeAdset")}</h2>
          <p className="mt-1 hidden text-xs text-[var(--text-dim)] sm:block">{t("adsetStepHint")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:hidden">
          <DsChoiceCard
            compact
            title={t("targetingMode_compiler")}
            icon={<Users size={16} />}
            accent={activeView !== "schedule" && targetingMode === "compiler"}
            onClick={() => selectView("compiler")}
          />
          <DsChoiceCard
            compact
            title={t("targetingMode_meta_saved")}
            icon={<Bookmark size={16} />}
            accent={activeView !== "schedule" && targetingMode === "meta_saved"}
            onClick={() => selectView("meta_saved")}
          />
          <DsChoiceCard
            compact
            title={t("targetingMode_advanced")}
            icon={<SlidersHorizontal size={16} />}
            accent={activeView !== "schedule" && targetingMode === "advanced"}
            onClick={() => selectView("advanced")}
          />
          <DsChoiceCard
            compact
            title={t("adsetSection_schedule_short")}
            icon={<CalendarDays size={16} />}
            accent={activeView === "schedule"}
            onClick={() => selectView("schedule")}
          />
        </div>

        <div className="hidden gap-4 lg:grid lg:grid-cols-4">
          <DsChoiceCard
            title={t("targetingMode_compiler")}
            description={t("targetingMode_compiler_hint")}
            icon={<Users size={18} />}
            accent={activeView !== "schedule" && targetingMode === "compiler"}
            onClick={() => selectView("compiler")}
            className="h-full"
          />
          <DsChoiceCard
            title={t("targetingMode_meta_saved")}
            description={t("targetingMode_meta_saved_hint")}
            icon={<Bookmark size={18} />}
            accent={activeView !== "schedule" && targetingMode === "meta_saved"}
            onClick={() => selectView("meta_saved")}
            className="h-full"
          />
          <DsChoiceCard
            title={t("targetingMode_advanced")}
            description={t("targetingMode_advanced_hint")}
            icon={<SlidersHorizontal size={18} />}
            accent={activeView !== "schedule" && targetingMode === "advanced"}
            onClick={() => selectView("advanced")}
            className="h-full"
          />
          <DsChoiceCard
            title={t("adsetSection_schedule_title")}
            description={t("adsetSection_schedule_hint")}
            icon={<CalendarDays size={18} />}
            accent={activeView === "schedule"}
            onClick={() => selectView("schedule")}
            className="h-full"
          />
        </div>
      </div>

      <div className="campaign-creator-main-scroll min-h-0 flex-1 overflow-y-auto pt-4 pb-2">
        <div className="campaign-creator-main-scroll__inner space-y-3">
        {activeView === "compiler" ? (
          <div className="space-y-3">
            {adsetSetupAccordion()}
            <WizardAccordionSection title={t("selectPersona")} defaultOpen>
              <PersonaPicker
                value={adset.personaId}
                clientSlug={payload.clientSlug}
                adAccountId={payload.adAccountId}
                disabled={clientRequired}
                onChange={(personaId) => patchAdset({ personaId })}
              />
            </WizardAccordionSection>
            {customAudiencesButton(t("metaRefineOptional"))}
            <WizardAccordionSection title={t("selectZone")} defaultOpen>
              <ZonePicker
                value={adset.zoneId}
                disabled={clientRequired}
                onChange={(zoneId) => patchAdset({ zoneId })}
              />
            </WizardAccordionSection>
          </div>
        ) : null}

        {activeView === "meta_saved" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {customAudiencesButton(t("savedAudiencesTitle"))}
              <button
                type="button"
                disabled={clientRequired}
                onClick={() => selectView("advanced")}
                className="ui-btn-secondary px-3 py-1.5 text-xs"
              >
                {t("detailedTargetingTitle")}
              </button>
            </div>
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
                if (!adset.name.trim() || isDefaultAdsetName(adset.name)) {
                  patchAdset({ name: audienceName.slice(0, 120) });
                }
              }}
            />
            <WizardAccordionSection title={t("selectZone")} defaultOpen>
              <ZonePicker
                value={adset.zoneId}
                disabled={clientRequired}
                onChange={(zoneId) => patchAdset({ zoneId })}
              />
            </WizardAccordionSection>
          </div>
        ) : null}

        {activeView === "advanced" ? (
          <div className="space-y-3">
            <AdvancedTargetingPanel
              targeting={targeting}
              clientRequired={clientRequired}
              metaGeoLocations={metaGeoLocations}
              mapViewport={mapViewport}
              commercialMarker={
                commercialLocation.lat != null && commercialLocation.lng != null
                  ? {
                      lat: commercialLocation.lat,
                      lng: commercialLocation.lng,
                      label: commercialLocation.normalized ?? commercialLocation.address ?? undefined
                    }
                  : null
              }
              centerCommercialDisabled={
                clientRequired ||
                commercialLocation.lat == null ||
                commercialLocation.lng == null
              }
              centerCommercialHint={commercialCenterHint}
              customAudiencesTrigger={customAudiencesButton(t("savedAudiencesTitle"))}
              onPatchTargeting={patchTargeting}
              onCenterCommercial={centerOnCommercialAddress}
            />
          </div>
        ) : null}

        {activeView === "schedule" ? (
          <div className="space-y-3">
            <WizardAccordionSection title={t("scheduleSection")} defaultOpen>
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
            </WizardAccordionSection>

            <WizardAccordionSection title={t("placements")} defaultOpen>
              <PlacementsPanel
                value={adset.placements}
                onChange={(placements) => patchAdset({ placements })}
                disabled={clientRequired}
              />
            </WizardAccordionSection>
          </div>
        ) : null}
        </div>
      </div>

      <ImportAdsetConfigModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        clientSlug={payload.clientSlug}
        adAccountId={payload.adAccountId}
        defaultCampaignId={payload.meta?.targetMetaCampaignId}
        onImport={handleImportAdset}
      />

      <CustomAudiencesModal
        open={customAudiencesOpen}
        onClose={() => setCustomAudiencesOpen(false)}
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
  );
}
