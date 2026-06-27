"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, SlidersHorizontal, Users } from "lucide-react";

import { AdSetCompilerLeadCards } from "@/components/campaign-creator/AdSetCompilerLeadCards";
import { AdSetConfigurationPanel } from "@/components/campaign-creator/AdSetConfigurationPanel";
import { AdSetPersonaZonePanel } from "@/components/campaign-creator/AdSetPersonaZonePanel";
import { AdvancedTargetingPanel } from "@/components/campaign-creator/AdvancedTargetingPanel";
import { CustomAudiencesModal } from "@/components/campaign-creator/CustomAudiencesModal";
import { SavedAudienceModal } from "@/components/campaign-creator/SavedAudienceModal";
import { ImportAdsetConfigModal } from "@/components/campaign-creator/ImportAdsetConfigModal";
import type { MapViewport } from "@/components/campaign-creator/GeoRadiusMapPicker";
import { CampaignCreatorDateTimeField } from "@/components/campaign-creator/CampaignCreatorDateTimeField";
import { PlacementsPanel } from "@/components/campaign-creator/PlacementsPanel";
import { CampaignCreatorUxMobileSummary } from "@/uxpilot-ui/adapters/CampaignCreatorUxMobileSummary";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { useAdSetStepSubflow, type AdSetSection } from "@/components/campaign-creator/AdSetStepSubflowContext";
import { FormField } from "@/components/ui/FormField";
import { type FormSelectOption } from "@/components/ui/FormSelect";
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
import type { AdSetDraftItem, DraftTargeting, TargetingItem } from "@/lib/campaign-draft";
import { defaultScheduleStartLocal } from "@/lib/campaign-placements";
import { DsChoiceCard } from "@/design-system/components/DsChoiceCard";
import { cn } from "@/lib/cn";

type AdSetView = AdSetSection;

export function AdSetStep() {
  const t = useTranslations("campaignCreator");
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
  const [savedAudienceModalOpen, setSavedAudienceModalOpen] = useState(false);
  const { section: activeView, canGoTo, isSectionVisited, goTo } = useAdSetStepSubflow();
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

  useEffect(() => {
    if (activeView === "advanced") {
      setMapViewport(null);
    }
  }, [activeView]);

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

  function flyToGeoLocation(item: TargetingItem) {
    const query = [item.label, item.meta?.countryCode].filter(Boolean).join(", ");
    const zoom =
      item.meta?.type === "country" ? 4 : item.meta?.type === "region" ? 7 : 11;
    fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then(
        (j: { ok?: boolean; latitude?: number; longitude?: number }) => {
          if (j.ok && j.latitude != null && j.longitude != null) {
            setMapViewport({ center: [j.latitude, j.longitude], zoom });
          }
        }
      )
      .catch(() => undefined);
  }

  function clearMapViewport() {
    setMapViewport(null);
  }

  const commercialCenterHint =
    !commercialLocation.address?.trim()
      ? t("commercialAddressMissing")
      : commercialLocation.lat == null
        ? t("commercialAddressGeocodeFailed")
        : null;

  const customAudienceCount =
    targeting.customAudienceIds.length + targeting.excludedAudienceIds.length;

  const includedAudienceCount = targeting.customAudienceIds.length;
  const excludedAudienceCount = targeting.excludedAudienceIds.length;

  function compilerTargetingSections() {
    return (
      <div className="campaign-creator-budget-body space-y-3">
        <AdSetCompilerLeadCards
          appliedAudienceName={adset.metaSavedAudienceName ?? null}
          disabled={clientRequired}
          onOpenSavedAudience={() => setSavedAudienceModalOpen(true)}
        />

        <AdSetPersonaZonePanel
          personaId={adset.personaId}
          zoneId={adset.zoneId}
          clientSlug={payload.clientSlug}
          adAccountId={payload.adAccountId}
          disabled={clientRequired}
          customAudienceCount={customAudienceCount}
          onPersonaChange={(personaId) => patchAdset({ personaId })}
          onZoneChange={(zoneId) => patchAdset({ zoneId })}
          onRefineAudience={() => setCustomAudiencesOpen(true)}
        />
      </div>
    );
  }

  useEffect(() => {
    if (
      !adset.metaSavedAudienceId ||
      adset.metaSavedAudienceName ||
      !payload.clientSlug ||
      !payload.adAccountId
    ) {
      return;
    }

    const qs = new URLSearchParams({
      clientId: payload.clientSlug,
      adAccountId: payload.adAccountId
    });

    fetch(`/api/meta/saved-audiences?${qs}`)
      .then((r) => r.json())
      .then(
        (j: {
          ok?: boolean;
          audiences?: Array<{ id: string; name: string }>;
        }) => {
          if (!j.ok) return;
          const found = j.audiences?.find((a) => a.id === adset.metaSavedAudienceId);
          if (found?.name) {
            patchAdset({ metaSavedAudienceName: found.name });
          }
        }
      )
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adset.metaSavedAudienceId, adset.metaSavedAudienceName, payload.clientSlug, payload.adAccountId]);

  useEffect(() => {
    if (!adset.metaSavedAudienceId && adset.metaSavedAudienceName) {
      patchAdset({ metaSavedAudienceName: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adset.metaSavedAudienceId, adset.metaSavedAudienceName]);

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

  /**
   * Saved audience = full Meta/Orion preset (geo, age, interests, custom audiences).
   * Persona + zone = library entities compiled at publish; loading a preset fills draft
   * targeting and keeps compiler mode so persona/zone pickers remain optional refinements.
   */
  function handleApplySavedAudience(
    next: DraftTargeting,
    audienceName: string,
    audienceId?: string
  ) {
    patchAdset({
      targetingMode: "compiler",
      metaSavedAudienceId: audienceId ?? null,
      metaSavedAudienceName: audienceName,
      targeting: next
    });
    if (!adset.name.trim() || isDefaultAdsetName(adset.name)) {
      patchAdset({ name: audienceName.slice(0, 120) });
    }
  }

  function selectView(view: AdSetView) {
    goTo(view);
    if (view === "compiler") patchAdset({ targetingMode: "compiler" });
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

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
      <div className="campaign-creator-step-scroll min-h-0 flex-1 overflow-y-auto pb-2">
        <div className="space-y-3">
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

        <AdSetConfigurationPanel
          layout="stacked"
          payload={payload}
          adset={adset}
          clientRequired={clientRequired}
          addAdsetMode={addAdsetMode}
          dynamicCreativeLockedByReuse={dynamicCreativeLockedByReuse}
          conversionLocationOptions={conversionLocationOptions}
          pixelOptions={pixelOptions}
          conversionEventOptions={conversionEventOptions}
          onPatchAdset={patchAdset}
          onImport={() => setImportOpen(true)}
        />

        <div className="rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-3 py-2.5">
          <p className="text-xs font-semibold text-[var(--ui-accent)]">{t("targetingMethodNoticeTitle")}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-dim)]">
            {t("targetingMethodNoticeBody")}
          </p>
        </div>

        <div className="campaign-creator-choice-cards campaign-creator-choice-cards--3">
          <DsChoiceCard
            layout="inline"
            title={t("targetingMode_compiler")}
            description={t("targetingMode_compiler_hint")}
            icon={<Users size={16} />}
            accent={activeView === "compiler"}
            muted={!isSectionVisited("compiler") && activeView !== "compiler"}
            visited={isSectionVisited("compiler") && activeView !== "compiler"}
            onClick={() => selectView("compiler")}
            className={!canGoTo("compiler") ? "pointer-events-none" : undefined}
          />
          <DsChoiceCard
            layout="inline"
            title={t("targetingMode_advanced")}
            description={t("targetingMode_advanced_hint")}
            icon={<SlidersHorizontal size={16} />}
            accent={activeView === "advanced"}
            muted={!isSectionVisited("advanced") && activeView !== "advanced"}
            visited={isSectionVisited("advanced") && activeView !== "advanced"}
            onClick={() => selectView("advanced")}
            className={!canGoTo("advanced") ? "pointer-events-none" : undefined}
          />
          <DsChoiceCard
            layout="inline"
            title={t("adsetSection_schedule_short")}
            description={t("adsetSection_schedule_hint")}
            icon={<CalendarDays size={16} />}
            accent={activeView === "schedule"}
            muted={!isSectionVisited("schedule") && activeView !== "schedule"}
            visited={isSectionVisited("schedule") && activeView !== "schedule"}
            onClick={() => selectView("schedule")}
            className={!canGoTo("schedule") ? "pointer-events-none" : undefined}
          />
        </div>

        {activeView === "compiler" ? compilerTargetingSections() : null}

        {activeView === "advanced" ? (
          <div className="space-y-3">
            <AdvancedTargetingPanel
              mapInstanceKey={activeView}
              targeting={targeting}
              clientSlug={payload.clientSlug}
              adAccountId={payload.adAccountId}
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
              savedAudiencesCount={audiences.length}
              includedAudienceCount={includedAudienceCount}
              excludedAudienceCount={excludedAudienceCount}
              onRefineAudience={() => setCustomAudiencesOpen(true)}
              onPatchTargeting={patchTargeting}
              onCenterCommercial={centerOnCommercialAddress}
              onGeoLocationAdd={flyToGeoLocation}
              onMapPinAdded={clearMapViewport}
            />
          </div>
        ) : null}

        {activeView === "schedule" ? (
          <div className="campaign-creator-advanced-targeting-body">
            <div className="campaign-creator-budget-top-grid">
              <section className="campaign-creator-card campaign-creator-budget-side-card">
                <h4 className="campaign-creator-section-title">{t("scheduleSection")}</h4>
                <div className="mt-2 flex min-h-0 flex-1 flex-col space-y-3">
                  <FormField label={t("scheduleStart")}>
                    <CampaignCreatorDateTimeField
                      value={adset.schedule.start ?? ""}
                      onChange={(start) =>
                        patchAdset({
                          schedule: { ...adset.schedule, start: start || null }
                        })
                      }
                      disabled={clientRequired}
                      aria-label={t("scheduleStart")}
                    />
                  </FormField>
                  <FormField label={t("scheduleEnd")}>
                    <CampaignCreatorDateTimeField
                      value={adset.schedule.end ?? ""}
                      onChange={(end) =>
                        patchAdset({
                          schedule: { ...adset.schedule, end: end || null }
                        })
                      }
                      disabled={clientRequired}
                      clearable
                      aria-label={t("scheduleEnd")}
                    />
                  </FormField>
                </div>
              </section>

              <PlacementsPanel
                value={adset.placements}
                onChange={(placements) => patchAdset({ placements })}
                disabled={clientRequired}
              />
            </div>
          </div>
        ) : null}

        <CampaignCreatorUxMobileSummary />
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

      <SavedAudienceModal
        open={savedAudienceModalOpen}
        onClose={() => setSavedAudienceModalOpen(false)}
        clientSlug={payload.clientSlug}
        adAccountId={payload.adAccountId}
        disabled={clientRequired}
        selectedId={adset.metaSavedAudienceId}
        onApply={handleApplySavedAudience}
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
