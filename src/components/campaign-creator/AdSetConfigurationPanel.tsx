"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { FormField } from "@/components/ui/FormField";
import { FormSelect, type FormSelectOption } from "@/components/ui/FormSelect";
import { META_ADSET_NAME_MAX_LENGTH } from "@/lib/adset-display-summary";
import type { AdSetDraftItem, CampaignDraftPayload } from "@/lib/campaign-draft";
import { cn } from "@/lib/cn";

type Props = {
  payload: CampaignDraftPayload;
  adset: AdSetDraftItem;
  clientRequired: boolean;
  addAdsetMode: boolean;
  dynamicCreativeLockedByReuse: boolean;
  conversionLocationOptions: FormSelectOption[];
  pixelOptions: FormSelectOption[];
  conversionEventOptions: FormSelectOption[];
  layout?: "default" | "stacked";
  onPatchAdset: (patch: Partial<AdSetDraftItem>) => void;
  onImport: () => void;
};

export function AdSetConfigurationPanel({
  payload,
  adset,
  clientRequired,
  addAdsetMode,
  dynamicCreativeLockedByReuse,
  conversionLocationOptions,
  pixelOptions,
  conversionEventOptions,
  layout = "default",
  onPatchAdset,
  onImport
}: Props) {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const [templateNotice, setTemplateNotice] = useState(false);

  const dynamicCreativeTip = useMemo(() => {
    switch (payload.objective) {
      case "leads":
        return t("dynamicCreativeTip_leads");
      case "sales":
        return t("dynamicCreativeTip_sales");
      case "traffic":
        return t("dynamicCreativeTip_traffic");
      case "awareness":
        return t("dynamicCreativeTip_awareness");
      case "engagement":
        return t("dynamicCreativeTip_engagement");
      case "app":
        return t("dynamicCreativeTip_app");
      default:
        return t("dynamicCreativeHint");
    }
  }, [payload.objective, t]);

  const nameLength = adset.name.length;
  const isStacked = layout === "stacked";

  const fieldsBlock = (
    <div className={isStacked ? "space-y-3" : "space-y-4"}>
        <FormField label={t("adsetName")}>
          <div className="relative">
            <input
              value={adset.name}
              maxLength={META_ADSET_NAME_MAX_LENGTH}
              onChange={(e) => onPatchAdset({ name: e.target.value.slice(0, META_ADSET_NAME_MAX_LENGTH) })}
              onFocus={(e) => e.target.select()}
              placeholder={t("adsetNamePlaceholder")}
              className="ui-input border-[var(--border-hover)] pr-16 shadow-sm"
              disabled={clientRequired}
            />
            <span
              className={cn(
                "pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] tabular-nums",
                nameLength >= META_ADSET_NAME_MAX_LENGTH
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-[var(--text-dimmer)]"
              )}
              aria-live="polite"
            >
              {t("adsetNameCharCount", {
                current: nameLength,
                max: META_ADSET_NAME_MAX_LENGTH
              })}
            </span>
          </div>
        </FormField>

        {payload.objective === "leads" || payload.objective === "sales" ? (
          <FormField label={t("conversionLocation")}>
            <FormSelect
              value={adset.conversionLocation}
              onChange={(v) =>
                onPatchAdset({
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
                      onPatchAdset({ messagingChannels: next });
                    }}
                  />
                  {ch}
                </label>
              ))}
            </div>
          </FormField>
        ) : null}

        {adset.conversionLocation === "website" ||
        adset.conversionLocation === "website_and_form" ||
        payload.objective === "sales" ? (
          <div className={cn("grid gap-3 sm:grid-cols-2", !isStacked && "campaign-creator-budget-group")}>
            <FormField label={tAds("pixel")}>
              <FormSelect
                value={adset.pixelId ?? ""}
                onChange={(v) => onPatchAdset({ pixelId: v || null })}
                placeholder={tAds("pixelNone")}
                options={pixelOptions}
                disabled={clientRequired}
              />
              {pixelOptions.length === 0 ? (
                <p className="mt-1 text-[11px] text-[var(--text-dim)]">{t("pixelEmptyHint")}</p>
              ) : null}
            </FormField>
            <FormField label={t("conversionEvent")}>
              <FormSelect
                value={adset.conversionEvent}
                onChange={(v) => onPatchAdset({ conversionEvent: v })}
                placeholder={t("conversionEventSelect")}
                options={conversionEventOptions}
                disabled={clientRequired}
              />
            </FormField>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {!addAdsetMode ? (
            <button
              type="button"
              onClick={onImport}
              disabled={clientRequired || !payload.adAccountId}
              className="ui-btn-secondary text-xs"
            >
              {t("importAdsetConfig")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setTemplateNotice(true)}
            disabled={clientRequired}
            className="ui-btn-secondary text-xs"
            title={t("saveAdsetTemplateComingSoon")}
          >
            {t("saveAdsetAsTemplate")}
          </button>
        </div>

        {templateNotice ? (
          <p className="text-[11px] text-[var(--text-dim)]">{t("saveAdsetTemplateComingSoon")}</p>
        ) : null}
    </div>
  );

  const dynamicCreativeBlock = (
    <div className={isStacked ? "campaign-creator-adset-dynamic-card mt-3" : "campaign-creator-adset-dynamic-card"}>
        {dynamicCreativeLockedByReuse ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--text-main)]">{t("dynamicCreativeReuseTitle")}</p>
            <p className="text-[11px] leading-relaxed text-[var(--text-dim)]">{t("dynamicCreativeReuseBody")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-main)]">{t("dynamicCreativeLabel")}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--text-dim)]">
                  {t("dynamicCreativeShortHint")}
                </p>
              </div>
              <label className="inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={adset.dynamicCreative}
                  onChange={(e) => onPatchAdset({ dynamicCreative: e.target.checked })}
                  disabled={clientRequired}
                  className="h-4 w-4 accent-[var(--ui-accent)]"
                />
              </label>
            </div>
            <div className="campaign-creator-adset-dynamic-tip">
              <Sparkles size={12} className="mt-0.5 shrink-0 text-[var(--ui-accent)]" />
              <p className="text-[10px] leading-relaxed text-[var(--text-main)]">{dynamicCreativeTip}</p>
            </div>
          </>
        )}
    </div>
  );

  if (isStacked) {
    return (
      <div>
        {fieldsBlock}
        {dynamicCreativeBlock}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-start">
      {fieldsBlock}
      {dynamicCreativeBlock}
    </div>
  );
}
