"use client";

import { useMemo, useState } from "react";
import { MapPin, Pencil, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { AiAudienceBriefFields } from "@/components/campaign-creator/ai-wizard/AiAudienceBriefFields";
import {
  buildDraftZoneSummary,
  ZoneGeoDraftReviewModal,
  ZoneGeoReviewPanel
} from "@/components/campaign-creator/ZoneGeoReviewPanel";
import { FormField } from "@/components/ui/FormField";
import type { AiCampaignWizardState } from "@/lib/campaign-creator/ai-campaign-wizard-types";
import {
  audienceLabelFromWizardInput,
  buildOrionAiCampaignNames,
  zoneLabelFromWizardInput
} from "@/lib/campaign-creator/ai-wizard-naming";
import { CAMPAIGN_OBJECTIVES, type ConversionLocation, type MessagingChannel } from "@/lib/campaign-draft";
import { normalizeZoneGeoRules } from "@/lib/zone-geo-shared";

type PreparePhase = "regions_preview" | "regions_geocode";

type PreparePayload = AiCampaignWizardState & {
  locale: string;
  provider: "claude";
};

type Props = {
  state: AiCampaignWizardState;
  locale: string;
  generating?: boolean;
  onChange: (patch: Partial<AiCampaignWizardState>) => void;
  onGenerate: () => void;
  onBack: () => void;
};

const MESSAGING_CHANNELS: MessagingChannel[] = ["whatsapp", "messenger", "instagram"];

async function callPreparePhase(phase: PreparePhase, payload: PreparePayload): Promise<PreparePayload> {
  const res = await fetch("/api/campaign-creator/ai-wizard/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, phase })
  });
  const j = (await res.json()) as PreparePayload & { ok?: boolean; error?: string };
  if (!res.ok || !j.ok) {
    throw new Error(j.error ?? "Erro ao preparar regiões");
  }
  return j;
}

export function AiWizardSummaryStep({
  state,
  locale,
  generating,
  onChange,
  onGenerate,
  onBack
}: Props) {
  const t = useTranslations("campaignCreator");
  const tW = useTranslations("campaignCreator.aiWizard");
  const tCommon = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [preparingMap, setPreparingMap] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const audienceLabel = useMemo(() => {
    if (state.audienceMode === "reuse") {
      if (state.selectedPersonaId) return tW("summaryReusePersona");
      if (state.selectedMetaAudienceId) return tW("summaryReuseMeta");
    }
    return (
      audienceLabelFromWizardInput({
        businessDescription: state.businessDescription,
        targetProfile: state.targetProfile,
        audiencePreviewName: state.audiencePreview?.personaName,
        targetingSuggestionName: state.targetingSuggestion?.name
      }) || "—"
    );
  }, [state, tW]);

  const regionLabel =
    state.zoneResolvedName ??
    state.zonePreview?.zoneName ??
    (state.selectedZoneId ? tW("summarySavedZone") : state.regionsDescription.trim() || "—");

  const previewNames = useMemo(
    () =>
      buildOrionAiCampaignNames({
        productDescription: state.productDescription || tW("summaryProduct"),
        objective: state.objective,
        locale,
        audienceLabel,
        zoneLabel: zoneLabelFromWizardInput({
          regionsDescription: state.regionsDescription,
          zoneResolvedName: state.zoneResolvedName,
          zonePreviewName: state.zonePreview?.zoneName
        })
      }),
    [audienceLabel, locale, state, tW]
  );

  const convLabel = (() => {
    const map: Record<string, string> = {
      website_and_form: t("convWebsiteAndForm"),
      website: t("convWebsite"),
      messaging: t("convMessaging"),
      calls: t("convCalls"),
      app: t("convApp"),
      instant_form: t("convInstantForm")
    };
    return map[state.conversionLocation] ?? state.conversionLocation;
  })();

  const destinationLabel =
    state.conversionLocation === "messaging"
      ? `${convLabel} (${state.messagingChannels.join(", ") || "—"})`
      : state.linkUrl.trim()
        ? state.linkUrl.trim()
        : convLabel;

  const draftZone = useMemo(() => {
    if (!state.zoneGeoRules) return null;
    return buildDraftZoneSummary({
      geoRules: state.zoneGeoRules,
      name: state.zoneResolvedName ?? state.zonePreview?.zoneName ?? tW("regionsDraftName"),
      description: state.zonePreview?.summary ?? state.regionsDescription ?? null,
      sourcePrompt: state.regionsDescription || null
    });
  }, [state, tW]);

  async function openRegionsMap() {
    setMapError(null);
    if (state.selectedZoneId) return;
    if (state.zoneGeoRules) {
      setMapOpen(true);
      return;
    }
    if (state.regionsDescription.trim().length < 3) {
      setMapError(tW("regionsRequired"));
      return;
    }
    setPreparingMap(true);
    try {
      let payload = { ...state, locale, provider: "claude" as const };
      payload = await callPreparePhase("regions_preview", payload);
      payload = await callPreparePhase("regions_geocode", payload);
      onChange({
        zonePreview: payload.zonePreview ?? null,
        zoneGeoRules: payload.zoneGeoRules ?? null,
        zoneResolvedName: payload.zoneResolvedName ?? null
      });
      setMapOpen(true);
    } catch (e) {
      setMapError(e instanceof Error ? e.message : tW("regionsInterpretFailed"));
    } finally {
      setPreparingMap(false);
    }
  }

  const conversionOptions: { value: ConversionLocation; labelKey: string }[] = [
    { value: "website_and_form", labelKey: "convWebsiteAndForm" },
    { value: "website", labelKey: "convWebsite" },
    { value: "messaging", labelKey: "convMessaging" },
    { value: "calls", labelKey: "convCalls" },
    { value: "app", labelKey: "convApp" }
  ];

  return (
    <div className="ui-card space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{tW("summaryTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{tW("summaryHint")}</p>
        </div>
        <button
          type="button"
          className="ui-btn-secondary inline-flex items-center gap-1.5 text-xs"
          disabled={generating}
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil size={14} />
          {editing ? tW("summaryDoneEdit") : tW("summaryEdit")}
        </button>
      </div>

      {editing ? (
        <div className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-4">
          <FormField label={tW("summaryObjective")}>
            <select
              className="ui-select w-full text-sm"
              value={state.objective}
              onChange={(e) =>
                onChange({ objective: e.target.value as AiCampaignWizardState["objective"] })
              }
            >
              {CAMPAIGN_OBJECTIVES.map((obj) => (
                <option key={obj} value={obj}>
                  {t(`objective_${obj}`)}
                </option>
              ))}
            </select>
          </FormField>

          {state.audienceMode === "create" ? (
            <AiAudienceBriefFields
              businessDescription={state.businessDescription}
              targetProfile={state.targetProfile}
              onBusinessDescriptionChange={(v) => onChange({ businessDescription: v })}
              onTargetProfileChange={(v) => onChange({ targetProfile: v })}
            />
          ) : (
            <p className="text-xs text-[var(--text-dim)]">{tW("summaryReuseAudienceHint")}</p>
          )}

          {!state.selectedZoneId ? (
            <FormField label={tW("regionsDescription")}>
              <textarea
                value={state.regionsDescription}
                onChange={(e) =>
                  onChange({
                    regionsDescription: e.target.value,
                    zonePreview: null,
                    zoneGeoRules: null,
                    zoneResolvedName: null
                  })
                }
                rows={3}
                className="ui-input w-full resize-none text-sm"
              />
            </FormField>
          ) : null}

          <FormField label={tW("productDescription")}>
            <textarea
              value={state.productDescription}
              onChange={(e) => onChange({ productDescription: e.target.value })}
              rows={3}
              className="ui-input w-full resize-none text-sm"
            />
          </FormField>

          <FormField label={tW("dailyBudget")}>
            <input
              type="number"
              min={1}
              step={1}
              value={state.dailyBudgetBRL}
              onChange={(e) => onChange({ dailyBudgetBRL: Number(e.target.value) || 0 })}
              className="ui-input w-full text-sm"
            />
          </FormField>

          <FormField label={t("conversionLocation")}>
            <select
              className="ui-select w-full text-sm"
              value={state.conversionLocation}
              onChange={(e) =>
                onChange({
                  conversionLocation: e.target.value as ConversionLocation,
                  messagingChannels:
                    e.target.value === "messaging" ? state.messagingChannels : []
                })
              }
            >
              {conversionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </FormField>

          {state.conversionLocation === "messaging" ? (
            <FormField label={t("messagingChannels")}>
              <div className="flex flex-wrap gap-3">
                {MESSAGING_CHANNELS.map((ch) => (
                  <label key={ch} className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
                    <input
                      type="checkbox"
                      checked={state.messagingChannels.includes(ch)}
                      onChange={() => {
                        const next = state.messagingChannels.includes(ch)
                          ? state.messagingChannels.filter((c) => c !== ch)
                          : [...state.messagingChannels, ch];
                        onChange({ messagingChannels: next });
                      }}
                    />
                    {ch}
                  </label>
                ))}
              </div>
            </FormField>
          ) : null}

          {(state.conversionLocation === "website" ||
            state.conversionLocation === "website_and_form") && (
            <FormField label={tW("summaryDestination")}>
              <input
                type="url"
                value={state.linkUrl}
                onChange={(e) => onChange({ linkUrl: e.target.value })}
                className="ui-input w-full text-sm"
                placeholder="https://"
              />
            </FormField>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label={tW("summaryObjective")} value={t(`objective_${state.objective}`)} />
          <SummaryCard label={tW("summaryAudience")} value={audienceLabel} />
          <SummaryCard label={tW("summaryRegions")} value={regionLabel} />
          <SummaryCard
            label={tW("summaryBudget")}
            value={`R$ ${state.dailyBudgetBRL.toLocaleString("pt-BR")} / ${tW("summaryPerDay")}`}
          />
          <SummaryCard label={tW("summaryDestination")} value={destinationLabel} className="sm:col-span-2" />
          <SummaryCard
            label={tW("summaryProduct")}
            value={state.productDescription.trim() || "—"}
            className="sm:col-span-2"
          />
          <SummaryCard
            label={tW("summaryCampaignNamePreview")}
            value={previewNames.campaignName}
            className="sm:col-span-2"
          />
          <SummaryCard
            label={tW("summaryAdsetNamePreview")}
            value={previewNames.adsetName}
            className="sm:col-span-2"
          />
        </div>
      )}

      {state.selectedZoneId ? (
        <ZoneGeoReviewPanel zoneId={state.selectedZoneId} />
      ) : state.regionsDescription.trim().length >= 3 || state.zoneGeoRules ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-3">
          <p className="text-xs font-semibold text-[var(--text-main)]">{tW("summaryRegionsMapTitle")}</p>
          <p className="mt-1 text-[11px] text-[var(--text-dim)]">{tW("summaryRegionsMapHint")}</p>
          <button
            type="button"
            className="ui-btn-secondary mt-3 inline-flex items-center gap-2 text-xs"
            disabled={generating || preparingMap}
            onClick={() => void openRegionsMap()}
          >
            <MapPin size={14} />
            {preparingMap ? tW("summaryRegionsMapLoading") : tW("summaryRegionsMapOpen")}
          </button>
          {mapError ? <p className="mt-2 text-xs text-red-600">{mapError}</p> : null}
        </div>
      ) : null}

      {mapOpen && draftZone ? (
        <ZoneGeoDraftReviewModal
          zone={draftZone}
          onClose={() => setMapOpen(false)}
          onConfirm={(geoRules) => {
            onChange({ zoneGeoRules: normalizeZoneGeoRules(geoRules) });
            setMapOpen(false);
          }}
        />
      ) : null}

      <div className="ui-alert-info text-sm">{tW("noCreativesDisclaimer")}</div>

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-color)] pt-4 sm:flex-row sm:justify-between">
        <button type="button" className="ui-btn-secondary" disabled={generating} onClick={onBack}>
          {tCommon("cancel")}
        </button>
        <button
          type="button"
          className="ui-btn-brand inline-flex items-center justify-center gap-2"
          disabled={generating}
          onClick={onGenerate}
        >
          <Sparkles size={16} />
          {generating ? tW("generating") : tW("generateCampaign")}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className = ""
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-3 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--text-main)]">{value}</p>
    </div>
  );
}
