"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  Settings2,
  SlidersHorizontal,
  Users,
  type LucideIcon
} from "lucide-react";

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
import { useAdSetStepSubflow } from "@/components/campaign-creator/AdSetStepSubflowContext";
import { FormField } from "@/components/ui/FormField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
import { ChoiceCardCheck } from "@/components/campaign-creator/BudgetChoiceCard";
import { DsChoiceCard } from "@/design-system/components/DsChoiceCard";
import { cn } from "@/lib/cn";

function TargetingMethodChoiceCard({
  selected,
  label,
  description,
  icon: Icon,
  onSelect
}: {
  selected: boolean;
  label: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row h-full min-h-[9.5rem]",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <ChoiceCardCheck selected={selected} />
      <span
        className={cn(
          "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
          selected
            ? "campaign-creator-budget-choice-card__icon--selected"
            : "campaign-creator-budget-choice-card__icon--unselected"
        )}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline">
          {label}
        </span>
        <span className="campaign-creator-budget-choice-card__description">{description}</span>
      </span>
    </button>
  );
}

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

  // Mutual exclusivity: Orion (compiler) and Meta (advanced) cannot be used together.
  const targetingMethod: "compiler" | "advanced" =
    adset.targetingMode === "advanced" ? "advanced" : "compiler";
  const compilerHasData = !!(adset.personaId || adset.zoneId);
  const advancedHasData =
    targeting.locations.length > 0 ||
    targeting.interests.length > 0 ||
    targeting.detailedGroups.length > 0 ||
    targeting.locales.length > 0 ||
    targeting.gender !== "all" ||
    targeting.ageMin !== 18 ||
    targeting.ageMax !== 65;
  const compilerLocked = targetingMethod === "advanced" && advancedHasData;
  const advancedLocked = targetingMethod === "compiler" && compilerHasData;
  const dynamicCreativeLockedByReuse = payload.ads.some(
    (ad) =>
      usesReusedMetaCreative(ad) &&
      resolveAdTargetAdsets(payload, ad).some((s) => s.id === adset.id)
  );

  const [mapViewport, setMapViewport] = useState<MapViewport | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [customAudiencesOpen, setCustomAudiencesOpen] = useState(false);
  const [savedAudienceModalOpen, setSavedAudienceModalOpen] = useState(false);
  const [pendingMethodSwitch, setPendingMethodSwitch] = useState<"compiler" | "advanced" | null>(null);
  const { section: activeSection, canGoTo, isSectionVisited, goTo } = useAdSetStepSubflow();
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
    if (targetingMethod === "advanced") {
      setMapViewport(null);
    }
  }, [targetingMethod]);

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

  function applyMethodSwitch(method: "compiler" | "advanced") {
    if (method === "advanced") {
      patchAdset({ targetingMode: "advanced", personaId: null, zoneId: null });
    } else {
      patchAdset({
        targetingMode: "compiler",
        targeting: {
          ...targeting,
          locations: [],
          ageMin: 18,
          ageMax: 65,
          gender: "all",
          interests: [],
          locales: [],
          detailedGroups: [],
          advantageAudience: false
        }
      });
    }
  }

  function selectTargetingMethod(method: "compiler" | "advanced") {
    if (method === targetingMethod) return;

    const otherHasData = method === "advanced" ? compilerHasData : advancedHasData;
    if (otherHasData) {
      setPendingMethodSwitch(method);
      return;
    }
    applyMethodSwitch(method);
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

  const scheduleSection = (
    <div className="campaign-creator-advanced-targeting-body">
      <h4 className="campaign-creator-section-title">{t("adsetSection_schedule_title")}</h4>
      <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{t("adsetSection_schedule_hint")}</p>
      <div className="campaign-creator-budget-top-grid mt-3">
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
  );

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
      <div className="campaign-creator-step-sticky-header space-y-3">
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

        <div className="campaign-creator-choice-cards campaign-creator-choice-cards--3">
          <DsChoiceCard
            layout="inline"
            title={t("adsetSub_setup")}
            description={t("adsetSection_setup_hint")}
            icon={<Settings2 size={18} />}
            accent={activeSection === "setup"}
            muted={!isSectionVisited("setup") && activeSection !== "setup"}
            visited={isSectionVisited("setup") && activeSection !== "setup"}
            onClick={() => goTo("setup")}
            className={!canGoTo("setup") ? "pointer-events-none" : undefined}
          />
          <DsChoiceCard
            layout="inline"
            title={t("adsetSub_segmentation")}
            description={t("adsetSection_segmentation_hint")}
            icon={<Users size={18} />}
            accent={activeSection === "segmentation"}
            muted={!isSectionVisited("segmentation") && activeSection !== "segmentation"}
            visited={isSectionVisited("segmentation") && activeSection !== "segmentation"}
            onClick={() => goTo("segmentation")}
            className={!canGoTo("segmentation") ? "pointer-events-none" : undefined}
          />
          <DsChoiceCard
            layout="inline"
            title={t("adsetSub_schedule")}
            description={t("adsetSection_schedule_hint")}
            icon={<CalendarClock size={18} />}
            accent={activeSection === "schedule"}
            muted={!isSectionVisited("schedule") && activeSection !== "schedule"}
            visited={isSectionVisited("schedule") && activeSection !== "schedule"}
            onClick={() => goTo("schedule")}
            className={!canGoTo("schedule") ? "pointer-events-none" : undefined}
          />
        </div>
      </div>

      <div className="campaign-creator-step-scroll min-h-0 flex-1 overflow-y-auto pt-5 pb-2">
        <div className="space-y-3">
          {activeSection === "setup" ? (
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
          ) : null}

          {activeSection === "segmentation" ? (
            <>
              <div
                className="grid items-stretch gap-4 sm:grid-cols-2"
                role="radiogroup"
                aria-label={t("adsetSub_segmentation")}
              >
                <TargetingMethodChoiceCard
                  selected={targetingMethod === "compiler"}
                  label={t("targetingSegment_orion")}
                  description={
                    compilerLocked ? t("targetingMethodLockedByAdvanced") : t("targetingSegment_orion_hint")
                  }
                  icon={Users}
                  onSelect={() => selectTargetingMethod("compiler")}
                />
                <TargetingMethodChoiceCard
                  selected={targetingMethod === "advanced"}
                  label={t("targetingSegment_meta")}
                  description={
                    advancedLocked ? t("targetingMethodLockedByCompiler") : t("targetingSegment_meta_hint")
                  }
                  icon={SlidersHorizontal}
                  onSelect={() => selectTargetingMethod("advanced")}
                />
              </div>

              {targetingMethod === "compiler" ? compilerTargetingSections() : null}

              {targetingMethod === "advanced" ? (
                <div className="space-y-3">
                  <AdvancedTargetingPanel
                    mapInstanceKey="advanced"
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
            </>
          ) : null}

          {activeSection === "schedule" ? scheduleSection : null}

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

      <ConfirmDialog
        open={pendingMethodSwitch !== null}
        title={t("targetingSwitchTitle")}
        description={
          pendingMethodSwitch === "advanced"
            ? t("targetingSwitchConfirmToAdvanced")
            : t("targetingSwitchConfirmToCompiler")
        }
        confirmLabel={t("targetingSwitchConfirmCta")}
        cancelLabel={t("modalCancel")}
        variant="danger"
        onConfirm={() => {
          if (pendingMethodSwitch) applyMethodSwitch(pendingMethodSwitch);
          setPendingMethodSwitch(null);
        }}
        onCancel={() => setPendingMethodSwitch(null)}
      />
    </div>
  );
}
