"use client";

import { useMemo, useState } from "react";
import { Bookmark, Download, MapPin, Sparkles, Tag, Target, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import type { FormSelectOption } from "@/components/ui/FormSelect";
import { DsAccentOutlineButton } from "@/design-system";
import { META_ADSET_NAME_MAX_LENGTH } from "@/lib/adset-display-summary";
import type { AdSetDraftItem, CampaignDraftPayload } from "@/lib/campaign-draft";
import { cn } from "@/lib/cn";

const creatorFilterFieldClass =
  "ui-filter-panel-field !border-[var(--creator-card-border,var(--border-color))] !bg-[var(--creator-card-bg-inset,var(--surface-bg))]";

const adsetFieldWrapperClass = "flex min-h-9 min-w-0 w-full flex-col justify-start";

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

  const isStacked = layout === "stacked";
  const showPixelEvent =
    adset.conversionLocation === "website" ||
    adset.conversionLocation === "website_and_form" ||
    payload.objective === "sales";

  const fieldsBlock = (
    <div className={isStacked ? "space-y-3" : "space-y-4"}>
        <div
          className={cn(
            "campaign-creator-objective-fields-row items-stretch",
            showPixelEvent
              ? "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.3fr)]"
              : "lg:grid-cols-1"
          )}
        >
          <div className={adsetFieldWrapperClass}>
            <FilterTextField
              creatorField
              className={cn(creatorFilterFieldClass, "min-w-0 w-full")}
              icon={<Tag size={13} />}
              label={t("nameLabel")}
              placeholder={t("adsetNamePlaceholder")}
              selectOnFocus
              value={adset.name}
              maxLength={META_ADSET_NAME_MAX_LENGTH}
              showCount
              countFormatter={(current, max) =>
                t("adsetNameCharCount", { current, max })
              }
              onChange={(name) =>
                onPatchAdset({ name: name.slice(0, META_ADSET_NAME_MAX_LENGTH) })
              }
              disabled={clientRequired}
            />
          </div>

          {showPixelEvent ? (
            <>
              <div className={adsetFieldWrapperClass}>
                <FilterSelectDropdown
                  className="ui-filter-panel-field min-w-0 w-full"
                  valueClassName="max-w-none min-w-0"
                  creatorField
                  icon={<Target size={13} />}
                  label={tAds("pixel")}
                  placeholder={tAds("pixelNone")}
                  value={adset.pixelId ?? ""}
                  onChange={(v) => onPatchAdset({ pixelId: v || null })}
                  options={pixelOptions}
                  disabled={clientRequired}
                />
              </div>
              <div className={adsetFieldWrapperClass}>
                <FilterSelectDropdown
                  className="ui-filter-panel-field min-w-0 w-full"
                  valueClassName="max-w-none min-w-0"
                  creatorField
                  icon={<Zap size={13} />}
                  label={t("conversionEvent")}
                  placeholder={t("conversionEventSelect")}
                  value={adset.conversionEvent}
                  onChange={(v) => onPatchAdset({ conversionEvent: v })}
                  options={conversionEventOptions}
                  disabled={clientRequired}
                  clearable={false}
                />
              </div>
            </>
          ) : null}
        </div>

        {showPixelEvent && pixelOptions.length === 0 ? (
          <p className="text-[11px] text-[var(--text-dim)]">{t("pixelEmptyHint")}</p>
        ) : null}

        {payload.objective === "leads" || payload.objective === "sales" ? (
          <FilterSelectDropdown
            className="ui-filter-panel-field max-w-none xl:max-w-none"
            valueClassName="max-w-none"
            creatorField
            icon={<MapPin size={13} />}
            label={t("conversionLocation")}
            placeholder={t("conversionLocation")}
            value={adset.conversionLocation}
            onChange={(v) =>
              onPatchAdset({
                conversionLocation: v as typeof adset.conversionLocation
              })
            }
            options={conversionLocationOptions}
            clearable={false}
            disabled={clientRequired}
          />
        ) : null}

        {adset.conversionLocation === "messaging" ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[var(--text-dim)]">{t("messagingChannels")}</p>
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
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {!addAdsetMode ? (
            <DsAccentOutlineButton
              onClick={onImport}
              disabled={clientRequired || !payload.adAccountId}
            >
              <Download size={14} strokeWidth={2.25} />
              {t("importAdsetConfig")}
            </DsAccentOutlineButton>
          ) : null}
          <DsAccentOutlineButton
            onClick={() => setTemplateNotice(true)}
            disabled={clientRequired}
            title={t("saveAdsetTemplateComingSoon")}
          >
            <Bookmark size={14} strokeWidth={2.25} />
            {t("saveAdsetAsTemplate")}
          </DsAccentOutlineButton>
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
