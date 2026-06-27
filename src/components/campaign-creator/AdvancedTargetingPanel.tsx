"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { MetaTargetingSelect } from "@/components/MetaTargetingSelect";
import { GeoRadiusMapPicker, type MapViewport } from "@/components/campaign-creator/GeoRadiusMapPicker";
import { FormField } from "@/components/ui/FormField";
import { isMapPinLocation } from "@/lib/campaign-draft";
import type { DraftTargeting, TargetingItem } from "@/lib/campaign-draft";
import { WizardAccordionSection } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

type AdvancedTargetingPanelProps = {
  targeting: DraftTargeting;
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
  customAudiencesTrigger: ReactNode;
  onPatchTargeting: (patch: Partial<DraftTargeting>) => void;
  onCenterCommercial: () => void;
};

export function AdvancedTargetingPanel({
  targeting,
  clientRequired,
  metaGeoLocations,
  mapViewport,
  mapInstanceKey,
  commercialMarker,
  centerCommercialDisabled,
  centerCommercialHint,
  customAudiencesTrigger,
  onPatchTargeting,
  onCenterCommercial
}: AdvancedTargetingPanelProps) {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");

  return (
    <div className="space-y-3">
      {customAudiencesTrigger}

      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
        {t("audienceOrDivider")}
      </p>

      <div className="space-y-3">
        <WizardAccordionSection title={t("advancedTargetingSection_location")} defaultOpen>
          <div className="space-y-2">
            <p className="text-[11px] text-[var(--text-dim)]">{t("metaGeoSectionHint")}</p>
            <FormField label={tAds("locations")}>
              <MetaTargetingSelect
                type="geo"
                placeholder={tAds("locationsPlaceholder")}
                selected={metaGeoLocations}
                onAdd={(item) =>
                  onPatchTargeting({
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
                  onPatchTargeting({
                    locations: targeting.locations.filter((p) => p.value !== value)
                  })
                }
                disabled={clientRequired}
              />
            </FormField>
          </div>

          <GeoRadiusMapPicker
            instanceKey={mapInstanceKey}
            pins={targeting.locations}
            onAdd={(item) => onPatchTargeting({ locations: [...targeting.locations, item] })}
            onRemove={(value) =>
              onPatchTargeting({ locations: targeting.locations.filter((p) => p.value !== value) })
            }
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
            onCenterCommercial={onCenterCommercial}
            centerCommercialDisabled={centerCommercialDisabled}
            centerCommercialHint={centerCommercialHint}
          />
        </WizardAccordionSection>

        <WizardAccordionSection title={t("advancedTargetingSection_demographics")}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        </WizardAccordionSection>

        <WizardAccordionSection title={t("advancedTargetingSection_interestsLocales")}>
          <FormField label={tAds("interests")}>
            <MetaTargetingSelect
              type="interest"
              placeholder={tAds("interestsPlaceholder")}
              selected={targeting.interests}
              onAdd={(item) => onPatchTargeting({ interests: [...targeting.interests, item] })}
              onRemove={(value) =>
                onPatchTargeting({ interests: targeting.interests.filter((p) => p.value !== value) })
              }
            />
          </FormField>
          <FormField label={t("targetingLocales")}>
            <MetaTargetingSelect
              type="locale"
              placeholder={t("targetingLocalesPlaceholder")}
              selected={targeting.locales}
              onAdd={(item) => onPatchTargeting({ locales: [...targeting.locales, item] })}
              onRemove={(value) =>
                onPatchTargeting({ locales: targeting.locales.filter((p) => p.value !== value) })
              }
            />
          </FormField>
        </WizardAccordionSection>

        <WizardAccordionSection title={t("advancedTargetingSection_behaviors")}>
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
        </WizardAccordionSection>

        <WizardAccordionSection title={t("advancedTargetingSection_detailedTargeting")}>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[var(--text-dim)]">{t("detailedTargetingTitle")}</p>
              <button
                type="button"
                disabled={clientRequired}
                onClick={() =>
                  onPatchTargeting({
                    detailedGroups: [...targeting.detailedGroups, { items: [] }]
                  })
                }
                className="ui-btn-secondary px-2.5 py-1 text-[11px]"
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
        </WizardAccordionSection>
      </div>
    </div>
  );
}
