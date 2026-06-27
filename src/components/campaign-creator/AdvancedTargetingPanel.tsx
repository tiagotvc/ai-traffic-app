"use client";

import { ChevronDown, ChevronRight, MapPin, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { MetaTargetingSelect } from "@/components/MetaTargetingSelect";
import { GeoRadiusMapPicker, type MapViewport } from "@/components/campaign-creator/GeoRadiusMapPicker";
import { MarkedAreasModal } from "@/components/campaign-creator/MarkedAreasModal";
import { ReachEstimateDetailsModal } from "@/components/campaign-creator/ReachEstimateDetailsModal";
import { FormField } from "@/components/ui/FormField";
import { useTargetingReachEstimate } from "@/hooks/useTargetingReachEstimate";
import { cn } from "@/lib/cn";
import { isMapPinLocation } from "@/lib/campaign-draft";
import type { DraftTargeting, TargetingItem } from "@/lib/campaign-draft";

type AdvancedTargetingPanelProps = {
  targeting: DraftTargeting;
  clientSlug: string;
  adAccountId: string;
  clientRequired: boolean;
  metaGeoLocations: TargetingItem[];
  mapViewport: MapViewport | null;
  mapInstanceKey?: string;
  commercialMarker: {
    lat: number;
    lng: number;
    label?: string;
  } | null;
  centerCommercialDisabled: boolean;
  centerCommercialHint: string | null;
  savedAudiencesCount: number;
  includedAudienceCount: number;
  excludedAudienceCount: number;
  onRefineAudience: () => void;
  onPatchTargeting: (patch: Partial<DraftTargeting>) => void;
  onCenterCommercial: () => void;
  onGeoLocationAdd: (item: TargetingItem) => void;
  onMapPinAdded: () => void;
};

function AdvancedTargetingSectionCard({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="campaign-creator-card campaign-creator-card--compact">
      <h4 className="campaign-creator-budget-header__title text-sm">{title}</h4>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function formatReachPeople(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(n);
}

export function AdvancedTargetingPanel({
  targeting,
  clientSlug,
  adAccountId,
  clientRequired,
  metaGeoLocations,
  mapViewport,
  mapInstanceKey,
  commercialMarker,
  centerCommercialDisabled,
  centerCommercialHint,
  savedAudiencesCount,
  includedAudienceCount,
  excludedAudienceCount,
  onRefineAudience,
  onPatchTargeting,
  onCenterCommercial,
  onGeoLocationAdd,
  onMapPinAdded
}: AdvancedTargetingPanelProps) {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const locale = useLocale();
  const [markedAreasOpen, setMarkedAreasOpen] = useState(false);
  const [reachDetailsOpen, setReachDetailsOpen] = useState(false);
  const [detailedOpen, setDetailedOpen] = useState(false);
  const mapPins = targeting.locations.filter(isMapPinLocation);
  const hasLocationSelection = metaGeoLocations.length > 0 || mapPins.length > 0;

  const reachEstimate = useTargetingReachEstimate({
    targeting,
    clientSlug,
    adAccountId,
    enabled: !clientRequired && hasLocationSelection
  });

  const patchLocations = (locations: TargetingItem[]) => onPatchTargeting({ locations });

  const handleMapPinAdd = (item: TargetingItem) => {
    patchLocations([...targeting.locations, item]);
    onMapPinAdded();
  };

  const reachBadge =
    reachEstimate.status === "ready"
      ? reachEstimate.tier === "good"
        ? t("advancedTargetingEstimatedReachBadgeGood")
        : reachEstimate.tier === "medium"
          ? t("advancedTargetingEstimatedReachBadgeMedium")
          : t("advancedTargetingEstimatedReachBadgeLow")
      : null;

  const reachValue =
    reachEstimate.status === "ready"
      ? t("advancedTargetingEstimatedReachPeople", {
          count: formatReachPeople(reachEstimate.usersMid, locale)
        })
      : reachEstimate.status === "loading"
        ? t("loading")
        : hasLocationSelection
          ? t("advancedTargetingEstimatedReachUnavailable")
          : t("advancedTargetingEstimatedReachEmpty");

  return (
    <div className="campaign-creator-advanced-targeting-body">
      <div className="campaign-creator-advanced-targeting-status-bar">
        <span className="campaign-creator-advanced-targeting-status-bar__label">
          {t("advancedTargetingSavedAudiencesBar")}
        </span>
        <span className="campaign-creator-advanced-targeting-status-bar__badge">
          {savedAudiencesCount}
        </span>
        {includedAudienceCount > 0 ? (
          <span className="campaign-creator-advanced-targeting-status-bar__stat">
            {t("advancedTargetingIncludedCount", { count: includedAudienceCount })}
          </span>
        ) : (
          <span className="campaign-creator-advanced-targeting-status-bar__stat campaign-creator-advanced-targeting-status-bar__stat--muted">
            {t("advancedTargetingIncludedCount", { count: 0 })}
          </span>
        )}
        {excludedAudienceCount > 0 ? (
          <span className="campaign-creator-advanced-targeting-status-bar__stat">
            {t("advancedTargetingExcludedCount", { count: excludedAudienceCount })}
          </span>
        ) : (
          <span className="campaign-creator-advanced-targeting-status-bar__stat campaign-creator-advanced-targeting-status-bar__stat--muted">
            {t("advancedTargetingExcludedCount", { count: 0 })}
          </span>
        )}
      </div>

      <div className="campaign-creator-advanced-targeting-grid">
        <div className="campaign-creator-advanced-targeting-left">
          <section className="campaign-creator-card campaign-creator-advanced-targeting-location">
            <div className="campaign-creator-advanced-targeting-location-stack">
              <div className="campaign-creator-advanced-targeting-location-controls">
                <div>
                  <h4 className="campaign-creator-budget-header__title text-sm">
                    {t("advancedTargetingSection_location")}
                  </h4>
                  <p className="mt-1 text-xs leading-snug text-[var(--text-dim)]">
                    {t("metaGeoSectionHint")}
                  </p>
                </div>

                <MetaTargetingSelect
                  type="geo"
                  chipsPlacement="below"
                  placeholder={tAds("locationsPlaceholder")}
                  selected={metaGeoLocations}
                  onAdd={(item) => {
                    const enriched: TargetingItem = {
                      ...item,
                      meta: {
                        type: item.meta?.type ?? "city",
                        countryCode: item.meta?.countryCode,
                        kind: item.meta?.kind,
                        radius:
                          item.meta?.type === "city" || item.meta?.type === "region" ? 10 : undefined,
                        distanceUnit:
                          item.meta?.type === "city" || item.meta?.type === "region"
                            ? ("kilometer" as const)
                            : undefined
                      }
                    };
                    onPatchTargeting({
                      locations: [...targeting.locations, enriched]
                    });
                    onGeoLocationAdd(enriched);
                  }}
                  onRemove={(value) =>
                    onPatchTargeting({
                      locations: targeting.locations.filter((p) => p.value !== value)
                    })
                  }
                  disabled={clientRequired}
                />

                <div className="campaign-creator-advanced-targeting-location-controls-meta">
                  <div className="campaign-creator-advanced-targeting-reach">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                          {t("advancedTargetingEstimatedReachLabel")}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-sm font-semibold text-[var(--text-main)]",
                            reachEstimate.status === "loading" && "animate-pulse"
                          )}
                        >
                          {reachValue}
                        </p>
                      </div>
                      {reachBadge && reachEstimate.status === "ready" ? (
                        <span
                          className={cn(
                            "campaign-creator-advanced-targeting-reach__badge",
                            `campaign-creator-advanced-targeting-reach__badge--${reachEstimate.tier}`
                          )}
                        >
                          {reachBadge}
                        </span>
                      ) : null}
                    </div>
                    {reachEstimate.status === "ready" ? (
                      <button
                        type="button"
                        onClick={() => setReachDetailsOpen(true)}
                        className="campaign-creator-advanced-targeting-reach__details mt-2 text-left text-[10px]"
                      >
                        {t("advancedTargetingEstimatedReachDetails")} →
                      </button>
                    ) : null}
                  </div>

                  <div className="campaign-creator-advanced-targeting-ai-tip">
                    <Sparkles size={14} className="mt-0.5 shrink-0 text-[var(--ui-accent)]" aria-hidden />
                    <p className="text-xs leading-relaxed text-[var(--text-main)]">
                      {t("advancedTargetingLocationAiTip")}
                    </p>
                  </div>
                </div>

                {!centerCommercialDisabled ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onCenterCommercial}
                      className="ui-btn-secondary shrink-0 whitespace-nowrap px-2.5 py-1.5 text-xs"
                    >
                      {t("centerCommercialAddress")}
                    </button>
                  </div>
                ) : centerCommercialHint ? (
                  <p className="text-[11px] text-[var(--text-dimmer)]">{centerCommercialHint}</p>
                ) : null}
              </div>

              <div className="campaign-creator-advanced-targeting-map-row">
                <button
                  type="button"
                  onClick={() => setMarkedAreasOpen(true)}
                  className="campaign-creator-advanced-targeting-map-edit-btn"
                >
                  <MapPin size={12} strokeWidth={2.25} aria-hidden />
                  {t("viewMarkedAreasButton")}
                  {mapPins.length > 0 ? (
                    <span className="rounded-full bg-[var(--ui-accent-muted)] px-1.5 py-px text-[9px] font-semibold text-[var(--ui-accent)]">
                      {mapPins.length}
                    </span>
                  ) : null}
                </button>

                <GeoRadiusMapPicker
                  instanceKey={mapInstanceKey}
                  mapOnly
                  pins={targeting.locations}
                  onAdd={handleMapPinAdd}
                  onRemove={(value) => patchLocations(targeting.locations.filter((p) => p.value !== value))}
                  onUpdateRadius={(value, radius) =>
                    onPatchTargeting({
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
                  commercialMarker={commercialMarker}
                />
              </div>
            </div>
          </section>

          <div className="campaign-creator-adset-refine-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-main)]">{t("refineAudienceTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
                  {t("refineAudienceSubtitle")}
                </p>
              </div>
              <button
                type="button"
                disabled={clientRequired}
                onClick={onRefineAudience}
                className="ui-btn-accent-outline inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg px-3 py-2 text-xs font-semibold sm:self-center"
              >
                {t("addAudiencesButton")} +
                {includedAudienceCount + excludedAudienceCount > 0 ? (
                  <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
                    {includedAudienceCount + excludedAudienceCount}
                  </span>
                ) : null}
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        <div className="campaign-creator-advanced-targeting-sections">
          <AdvancedTargetingSectionCard title={t("advancedTargetingSection_demographics")}>
            <div className="campaign-creator-advanced-targeting-demographics-row">
              <FormField label={tAds("ageMin")}>
                <input
                  type="number"
                  min={13}
                  max={65}
                  value={targeting.ageMin}
                  onChange={(e) => onPatchTargeting({ ageMin: Number(e.target.value) })}
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
                  onChange={(e) => onPatchTargeting({ ageMax: Number(e.target.value) })}
                  className="ui-input"
                  disabled={clientRequired}
                />
              </FormField>
              <FormField label={tAds("gender")}>
                <select
                  value={targeting.gender}
                  onChange={(e) =>
                    onPatchTargeting({ gender: e.target.value as DraftTargeting["gender"] })
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
          </AdvancedTargetingSectionCard>

          <AdvancedTargetingSectionCard title={t("advancedTargetingSection_interestsLocales")}>
            <MetaTargetingSelect
              type="interest"
              placeholder={tAds("interestsPlaceholder")}
              selected={targeting.interests}
              onAdd={(item) => onPatchTargeting({ interests: [...targeting.interests, item] })}
              onRemove={(value) =>
                onPatchTargeting({ interests: targeting.interests.filter((p) => p.value !== value) })
              }
            />
            <MetaTargetingSelect
              type="locale"
              placeholder={t("targetingLocalesPlaceholder")}
              selected={targeting.locales}
              onAdd={(item) => onPatchTargeting({ locales: [...targeting.locales, item] })}
              onRemove={(value) =>
                onPatchTargeting({ locales: targeting.locales.filter((p) => p.value !== value) })
              }
            />
          </AdvancedTargetingSectionCard>

          <AdvancedTargetingSectionCard title={t("advancedTargetingSection_behaviors")}>
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
                onPatchTargeting({ detailedGroups: groups });
              }}
              onRemove={(value) =>
                onPatchTargeting({
                  detailedGroups: targeting.detailedGroups
                    .map((g) => ({ items: g.items.filter((i) => i.value !== value) }))
                    .filter((g) => g.items.length)
                })
              }
            />
            <label className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
              <input
                type="checkbox"
                checked={targeting.advantageAudience}
                onChange={(e) => onPatchTargeting({ advantageAudience: e.target.checked })}
                disabled={clientRequired}
                className="accent-[var(--ui-accent)]"
              />
              {t("advantageAudience")}
            </label>
          </AdvancedTargetingSectionCard>
        </div>
      </div>

      <section className="campaign-creator-adset-refine-card campaign-creator-advanced-targeting-detailed">
        <button
          type="button"
          onClick={() => setDetailedOpen((open) => !open)}
          className="campaign-creator-advanced-targeting-detailed-toggle"
          aria-expanded={detailedOpen}
        >
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">
              {t("advancedTargetingSection_detailedTargeting")}
            </h4>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-dim)]">
              {t("detailedTargetingHint")}
            </p>
          </div>
          <ChevronDown
            size={16}
            className={cn(
              "shrink-0 text-[var(--text-dim)] transition-transform",
              detailedOpen && "rotate-180"
            )}
            aria-hidden
          />
        </button>

        {detailedOpen ? (
          <div className="mt-3 space-y-3 border-t border-[var(--ui-accent-border)] pt-3">
            <div className="flex justify-end">
              <button
                type="button"
                disabled={clientRequired}
                onClick={() =>
                  onPatchTargeting({
                    detailedGroups: [...targeting.detailedGroups, { items: [] }]
                  })
                }
                className="ui-btn-accent-outline shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold"
              >
                {t("detailedTargetingAddGroup")}
              </button>
            </div>

            {targeting.detailedGroups.map((group, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg,var(--surface-card))]/80 p-2.5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--text-dim)]">
                    {t("detailedTargetingGroup", { n: idx + 1 })}
                  </span>
                  <button
                    type="button"
                    disabled={clientRequired}
                    onClick={() =>
                      onPatchTargeting({
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
                    onPatchTargeting({ detailedGroups: groups, interests: [] });
                  }}
                  onRemove={(value) => {
                    const groups = targeting.detailedGroups.map((g, i) =>
                      i === idx ? { items: g.items.filter((x) => x.value !== value) } : g
                    );
                    onPatchTargeting({ detailedGroups: groups.filter((g) => g.items.length) });
                  }}
                />
              </div>
            ))}

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
                  onPatchTargeting({ detailedGroups: groups });
                }}
                onRemove={(value) =>
                  onPatchTargeting({
                    detailedGroups: targeting.detailedGroups
                      .map((g) => ({ items: g.items.filter((i) => i.value !== value) }))
                      .filter((g) => g.items.length)
                  })
                }
              />
            </FormField>
          </div>
        ) : null}
      </section>

      <MarkedAreasModal
        open={markedAreasOpen}
        onClose={() => setMarkedAreasOpen(false)}
        pins={mapPins}
        onUpdateRadius={(value, radius) =>
          onPatchTargeting({
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
        onRemove={(value) =>
          onPatchTargeting({
            locations: targeting.locations.filter((p) => p.value !== value)
          })
        }
      />

      {reachEstimate.status === "ready" ? (
        <ReachEstimateDetailsModal
          open={reachDetailsOpen}
          onClose={() => setReachDetailsOpen(false)}
          usersLowerBound={reachEstimate.usersLowerBound}
          usersUpperBound={reachEstimate.usersUpperBound}
          tier={reachEstimate.tier}
        />
      ) : null}
    </div>
  );
}
