"use client";

import { useTranslations } from "next-intl";

import { MetaTargetingSelect } from "@/components/MetaTargetingSelect";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { usePublishAssets } from "@/hooks/usePublishAssets";

export function AdSetStep() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const { payload, updatePayload } = useCampaignDraft();
  const { audiences } = usePublishAssets(payload.clientSlug, payload.adAccountId);
  const targeting = payload.adset.targeting;

  function patchTargeting(patch: Partial<typeof targeting>) {
    updatePayload((p) => ({
      ...p,
      adset: {
        ...p.adset,
        targeting: { ...p.adset.targeting, ...patch }
      }
    }));
  }

  return (
    <div className="space-y-4">
      <FormField label={t("adsetName")}>
        <input
          value={payload.adset.name}
          onChange={(e) =>
            updatePayload((p) => ({
              ...p,
              adset: { ...p.adset, name: e.target.value }
            }))
          }
          className="ui-input"
        />
      </FormField>

      {payload.objective === "leads" ? (
        <FormField label={t("conversionLocation")}>
          <select
            value={payload.adset.conversionLocation}
            onChange={(e) =>
              updatePayload((p) => ({
                ...p,
                adset: {
                  ...p.adset,
                  conversionLocation: e.target.value as typeof payload.adset.conversionLocation
                }
              }))
            }
            className="ui-select"
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FormField label={tAds("ageMin")}>
            <input
              type="number"
              min={13}
              max={65}
              value={targeting.ageMin}
              onChange={(e) => patchTargeting({ ageMin: Number(e.target.value) })}
              className="ui-input"
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
            />
          </FormField>
          <FormField label={tAds("gender")}>
            <select
              value={targeting.gender}
              onChange={(e) =>
                patchTargeting({ gender: e.target.value as typeof targeting.gender })
              }
              className="ui-select"
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
              value={payload.adset.schedule.start ?? ""}
              onChange={(e) =>
                updatePayload((p) => ({
                  ...p,
                  adset: {
                    ...p.adset,
                    schedule: { ...p.adset.schedule, start: e.target.value || null }
                  }
                }))
              }
              className="ui-input"
            />
          </FormField>
          <FormField label={t("scheduleEnd")}>
            <input
              type="datetime-local"
              value={payload.adset.schedule.end ?? ""}
              onChange={(e) =>
                updatePayload((p) => ({
                  ...p,
                  adset: {
                    ...p.adset,
                    schedule: { ...p.adset.schedule, end: e.target.value || null }
                  }
                }))
              }
              className="ui-input"
            />
          </FormField>
        </div>
      </div>

      <FormField label={t("placements")}>
        <select
          value={payload.adset.placements}
          onChange={(e) =>
            updatePayload((p) => ({
              ...p,
              adset: { ...p.adset, placements: e.target.value as "advantage_plus" | "manual" }
            }))
          }
          className="ui-select"
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
