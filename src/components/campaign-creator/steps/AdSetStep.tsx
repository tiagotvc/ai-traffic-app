"use client";

import { useTranslations } from "next-intl";

import { MetaTargetingSelect } from "@/components/MetaTargetingSelect";
import { AdSetBatchPanel } from "@/components/campaign-creator/AdSetBatchPanel";
import { GeoRadiusMapPicker } from "@/components/campaign-creator/GeoRadiusMapPicker";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { usePublishAssets } from "@/hooks/usePublishAssets";
import { getActiveAdset } from "@/lib/campaign-draft";
import type { DraftTargeting } from "@/lib/campaign-draft";

export function AdSetStep() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const { payload, updatePayload } = useCampaignDraft();
  const { audiences } = usePublishAssets(payload.clientSlug, payload.adAccountId);
  const adset = getActiveAdset(payload);
  const targeting = adset.targeting;
  const clientRequired = !payload.clientSlug;

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

  return (
    <div className="space-y-4">
      {!payload.clientSlug ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("selectClientFirst")}
        </p>
      ) : null}

      {payload.adsets.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {payload.adsets.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => selectAdset(a.id)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                adset.id === a.id
                  ? "bg-violet-100 font-medium text-violet-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {a.name || t("treeAdset")}
            </button>
          ))}
        </div>
      ) : null}

      <AdSetBatchPanel />

      <FormField label={t("adsetName")}>
        <input
          value={adset.name}
          onChange={(e) => patchAdset({ name: e.target.value })}
          className="ui-input"
          disabled={clientRequired}
        />
      </FormField>

      {payload.objective === "leads" ? (
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
          </select>
        </FormField>
      ) : null}

      <div className="ui-card space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{tAds("audienceTitle")}</h3>
        <FormField label={tAds("locations")}>
          <MetaTargetingSelect
            type="geo"
            placeholder={tAds("locationsPlaceholder")}
            selected={targeting.locations}
            onAdd={(item) => patchTargeting({ locations: [...targeting.locations, item] })}
            onRemove={(value) =>
              patchTargeting({ locations: targeting.locations.filter((p) => p.value !== value) })
            }
          />
        </FormField>

        <GeoRadiusMapPicker
          locations={targeting.locations}
          onAdd={(item) => patchTargeting({ locations: [...targeting.locations, item] })}
          onRemove={(value) =>
            patchTargeting({ locations: targeting.locations.filter((p) => p.value !== value) })
          }
          onUpdateRadius={(value, radius) =>
            patchTargeting({
              locations: targeting.locations.map((l) =>
                l.value === value
                  ? {
                      ...l,
                      meta: {
                        ...l.meta,
                        type: l.meta?.type ?? "city",
                        radius,
                        distanceUnit: "kilometer"
                      }
                    }
                  : l
              )
            })
          }
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
        {audiences.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={tAds("audienceInclude")}>
              <select
                multiple
                value={targeting.customAudienceIds}
                onChange={(e) =>
                  patchTargeting({
                    customAudienceIds: Array.from(e.target.selectedOptions, (o) => o.value)
                  })
                }
                className="ui-select h-24"
                disabled={clientRequired}
              >
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={tAds("audienceExclude")}>
              <select
                multiple
                value={targeting.excludedAudienceIds}
                onChange={(e) =>
                  patchTargeting({
                    excludedAudienceIds: Array.from(e.target.selectedOptions, (o) => o.value)
                  })
                }
                className="ui-select h-24"
                disabled={clientRequired}
              >
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        ) : null}
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t("scheduleSection")}</h3>
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
        <select
          value={adset.placements}
          onChange={(e) =>
            patchAdset({ placements: e.target.value as "advantage_plus" | "manual" })
          }
          className="ui-select"
          disabled={clientRequired}
        >
          <option value="advantage_plus">{t("placementsAdvantage")}</option>
          <option value="manual" disabled>
            {t("placementsManualSoon")}
          </option>
        </select>
      </FormField>
    </div>
  );
}
