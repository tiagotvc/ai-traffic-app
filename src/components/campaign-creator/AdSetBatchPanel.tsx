"use client";

import { useTranslations } from "next-intl";

import { MetaTargetingSelect } from "@/components/MetaTargetingSelect";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import type { VariationAxis } from "@/lib/campaign-draft";
import { buildAdSetVariants, getActiveAdset, syncAdsetsFromBatch } from "@/lib/campaign-draft";

const AXES: VariationAxis[] = [
  "location",
  "ageRange",
  "customAudience",
  "interests",
  "gender"
];

export function AdSetBatchPanel() {
  const t = useTranslations("campaignCreator");
  const { payload, updatePayload } = useCampaignDraft();
  const batch = payload.adsetBatch;
  const base = getActiveAdset(payload);

  function patchBatch(patch: Partial<typeof batch>) {
    updatePayload((p) => {
      const next = { ...p, adsetBatch: { ...p.adsetBatch, ...patch } };
      if (patch.enabled !== undefined || patch.extraCount !== undefined) {
        next.adsetBatch.enabled = (patch.extraCount ?? next.adsetBatch.extraCount) > 0;
      }
      return syncAdsetsFromBatch(next);
    });
  }

  const preview = buildAdSetVariants(base, batch, payload.campaign.name || base.name);

  return (
    <div className="ui-card space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{t("batchTitle")}</h3>
        <p className="mt-1 text-[11px] text-slate-500">{t("batchHint")}</p>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{t("batchExtraCount", { count: batch.extraCount })}</span>
          <span className="font-medium text-violet-700">
            {batch.extraCount > 0 ? `+${batch.extraCount}` : t("batchNone")}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={batch.extraCount}
          onChange={(e) =>
            patchBatch({
              extraCount: Number(e.target.value),
              enabled: Number(e.target.value) > 0
            })
          }
          className="mt-2 w-full accent-violet-600"
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          {Array.from({ length: 11 }, (_, i) => (
            <span key={i}>{i === 0 ? "0" : i}</span>
          ))}
        </div>
      </div>

      {batch.extraCount > 0 ? (
        <>
          <div>
            <p className="text-xs font-medium text-slate-600">{t("batchVariationAxes")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AXES.map((axis) => {
                const checked = batch.variationAxes.includes(axis);
                return (
                  <label
                    key={axis}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        patchBatch({
                          variationAxes: checked
                            ? batch.variationAxes.filter((a) => a !== axis)
                            : [...batch.variationAxes, axis]
                        })
                      }
                      className="accent-violet-600"
                    />
                    {t(`axis_${axis}`)}
                  </label>
                );
              })}
            </div>
          </div>

          {batch.variationAxes.includes("location") ? (
            <div>
              <p className="text-xs font-medium text-slate-600">{t("batchLocationVariants")}</p>
              <MetaTargetingSelect
                type="geo"
                placeholder={t("batchAddLocation")}
                selected={batch.locationVariants}
                onAdd={(item) =>
                  patchBatch({ locationVariants: [...batch.locationVariants, item] })
                }
                onRemove={(value) =>
                  patchBatch({
                    locationVariants: batch.locationVariants.filter((l) => l.value !== value)
                  })
                }
              />
            </div>
          ) : null}

          {batch.variationAxes.includes("ageRange") ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">{t("batchAgeRanges")}</p>
              {batch.ageRanges.map((range, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    value={range.label}
                    onChange={(e) => {
                      const next = [...batch.ageRanges];
                      next[i] = { ...range, label: e.target.value };
                      patchBatch({ ageRanges: next });
                    }}
                    className="ui-input flex-1 text-xs"
                    placeholder={t("batchAgeLabel")}
                  />
                  <input
                    type="number"
                    min={13}
                    max={65}
                    value={range.ageMin}
                    onChange={(e) => {
                      const next = [...batch.ageRanges];
                      next[i] = { ...range, ageMin: Number(e.target.value) };
                      patchBatch({ ageRanges: next });
                    }}
                    className="ui-input w-16 text-xs"
                  />
                  <span className="text-xs text-slate-400">—</span>
                  <input
                    type="number"
                    min={13}
                    max={65}
                    value={range.ageMax}
                    onChange={(e) => {
                      const next = [...batch.ageRanges];
                      next[i] = { ...range, ageMax: Number(e.target.value) };
                      patchBatch({ ageRanges: next });
                    }}
                    className="ui-input w-16 text-xs"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patchBatch({
                    ageRanges: [
                      ...batch.ageRanges,
                      { label: `18-24`, ageMin: 18, ageMax: 24 }
                    ]
                  })
                }
                className="text-xs text-violet-600 hover:underline"
              >
                {t("batchAddAgeRange")}
              </button>
            </div>
          ) : null}

          {batch.variationAxes.includes("gender") ? (
            <div>
              <p className="text-xs font-medium text-slate-600">{t("batchGenderVariants")}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["all", "male", "female"] as const).map((g) => {
                  const checked = batch.genderVariants.includes(g);
                  return (
                    <label key={g} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          patchBatch({
                            genderVariants: checked
                              ? batch.genderVariants.filter((x) => x !== g)
                              : [...batch.genderVariants, g]
                          })
                        }
                        className="accent-violet-600"
                      />
                      {g === "all" ? t("genderAll") : g === "male" ? t("genderMale") : t("genderFemale")}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <p className="mb-2 text-xs font-medium text-slate-600">{t("batchPreview")}</p>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">{t("adsetName")}</th>
                  <th className="py-1">{t("audienceSummary")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2 text-slate-400">{i + 1}</td>
                    <td className="py-1.5 pr-2 font-medium text-slate-800">{row.name}</td>
                    <td className="py-1.5 text-slate-600">
                      {row.targeting.locations[0]?.label ?? "—"} · {row.targeting.ageMin}-
                      {row.targeting.ageMax}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
