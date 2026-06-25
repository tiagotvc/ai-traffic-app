"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { AiCampaignGenerationOverlay } from "@/components/campaign-creator/AiCampaignGenerationOverlay";
import { ObjectiveSelector } from "@/components/campaign-creator/ObjectiveSelector";
import { AiAudienceStep } from "@/components/campaign-creator/ai-wizard/AiAudienceStep";
import { AiOfferDestinationStep, applyDefaultConversionForObjective } from "@/components/campaign-creator/ai-wizard/AiOfferDestinationStep";
import { AiRegionsField } from "@/components/campaign-creator/ai-wizard/AiRegionsField";
import { AiWizardSummaryStep } from "@/components/campaign-creator/ai-wizard/AiWizardSummaryStep";
import { useRouter } from "@/i18n/navigation";
import { usePublishAssets } from "@/hooks/usePublishAssets";
import {
  AI_WIZARD_STEPS,
  defaultAiCampaignWizardState,
  isAudienceStepValid,
  isOfferStepValid,
  isRegionsStepValid,
  wizardNeedsAudiencePrep,
  wizardNeedsRegionsPrep,
  type AiCampaignWizardState,
  type AiWizardStepId
} from "@/lib/campaign-creator/ai-campaign-wizard-types";
import type { AiCampaignGenerationStep } from "@/lib/ai-campaign-generation-progress";
import type { CampaignObjectiveKey } from "@/lib/campaign-draft";

type ClientOption = { id: string; slug: string; name: string };

type PreparePhase = "audience_preview" | "audience_targeting" | "regions_preview" | "regions_geocode";

type GeneratePayload = AiCampaignWizardState & {
  locale: string;
  provider: "claude";
  audiencePreview?: AiCampaignWizardState["audiencePreview"];
  targetingSuggestion?: AiCampaignWizardState["targetingSuggestion"];
  zonePreview?: AiCampaignWizardState["zonePreview"];
  zoneGeoRules?: AiCampaignWizardState["zoneGeoRules"];
  zoneResolvedName?: AiCampaignWizardState["zoneResolvedName"];
};

async function callPreparePhase(phase: PreparePhase, payload: GeneratePayload): Promise<GeneratePayload> {
  const res = await fetch("/api/campaign-creator/ai-wizard/prepare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, phase })
  });
  const j = (await res.json()) as GeneratePayload & { ok?: boolean; error?: string };
  if (!res.ok || !j.ok) {
    throw new Error(j.error ?? "Erro ao preparar campanha com IA");
  }
  return j;
}

type Props = {
  initialClientSlug?: string;
};

export function AiCampaignWizardClient({ initialClientSlug }: Props) {
  const t = useTranslations("campaignCreator.aiWizard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(initialClientSlug ? 1 : 0);
  const [state, setState] = useState<AiCampaignWizardState>(() =>
    defaultAiCampaignWizardState({ clientSlug: initialClientSlug ?? "" })
  );
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState<AiCampaignGenerationStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { accounts, accountsLoading, defaultAdAccountId } = usePublishAssets(
    state.clientSlug,
    ""
  );

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j: { clients?: ClientOption[] }) => setClients(j.clients ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (defaultAdAccountId && !state.adAccountId) {
      setState((s) => ({ ...s, adAccountId: defaultAdAccountId }));
    }
  }, [defaultAdAccountId, state.adAccountId]);

  const currentStep = AI_WIZARD_STEPS[stepIndex]!;

  const stepLabels = useMemo(
    () =>
      AI_WIZARD_STEPS.map((id) => ({
        id,
        label: t(`step_${id}`)
      })),
    [t]
  );

  const patch = useCallback((p: Partial<AiCampaignWizardState>) => {
    setState((prev) => ({ ...prev, ...p }));
  }, []);

  function canAdvanceFrom(step: AiWizardStepId): boolean {
    switch (step) {
      case "setup":
        return Boolean(state.clientSlug && state.adAccountId);
      case "objective":
        return true;
      case "audience":
        return isAudienceStepValid(state);
      case "regions":
        return isRegionsStepValid(state);
      case "offer":
        return isOfferStepValid(state);
      case "summary":
        return true;
      default:
        return false;
    }
  }

  function goNext() {
    if (!canAdvanceFrom(currentStep)) return;
    setStepIndex((i) => Math.min(i + 1, AI_WIZARD_STEPS.length - 1));
    setError(null);
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
    setError(null);
  }

  async function runGenerate() {
    setGenerating(true);
    setError(null);
    let payload: GeneratePayload = { ...state, locale, provider: "claude" };

    try {
      if (wizardNeedsAudiencePrep(payload)) {
        setGenStep("understandingAudience");
        payload = await callPreparePhase("audience_preview", payload);
        setGenStep("matchingMetaAudience");
        payload = await callPreparePhase("audience_targeting", payload);
      }

      if (wizardNeedsRegionsPrep(payload)) {
        setGenStep("understandingRegions");
        payload = await callPreparePhase("regions_preview", payload);
        setGenStep("placingRegionsOnMap");
        payload = await callPreparePhase("regions_geocode", payload);
      }

      setGenStep("writingAdCopy");
      const res = await fetch("/api/campaign-creator/ai-wizard/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = (await res.json()) as { ok?: boolean; draftId?: string; error?: string; message?: string };
      if (!res.ok || !j.ok || !j.draftId) {
        throw new Error(j.message ?? j.error ?? t("generateFailed"));
      }
      setGenStep("organizingStructure");
      setGenStep("openingCreator");
      window.setTimeout(() => {
        router.replace(`/campaigns/new/${j.draftId}?active=ad`);
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("generateFailed"));
      setGenerating(false);
      setGenStep(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(124,58,237,0.12)] text-[var(--violet)]">
          <Sparkles size={22} />
        </span>
        <h1 className="mt-3 font-heading text-xl font-semibold text-[var(--text-main)]">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("subtitle")}</p>
      </div>

      <nav aria-label={t("stepperLabel")} className="flex flex-wrap justify-center gap-1.5">
        {stepLabels.map((s, i) => (
          <span
            key={s.id}
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              i === stepIndex
                ? "bg-[var(--amber-bright)]/20 text-amber-800"
                : i < stepIndex
                  ? "bg-[var(--success)]/15 text-[var(--success)]"
                  : "bg-[var(--surface-thead)] text-[var(--text-dimmer)]"
            }`}
          >
            {s.label}
          </span>
        ))}
      </nav>

      {currentStep === "setup" ? (
        <div className="ui-card space-y-3 p-5">
          <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{t("setupTitle")}</h2>
          <div>
            <label className="text-xs text-[var(--text-dim)]">{t("selectClient")}</label>
            <select
              value={state.clientSlug}
              onChange={(e) => patch({ clientSlug: e.target.value, adAccountId: "" })}
              className="ui-select mt-1 w-full"
            >
              <option value="">{t("selectClientPlaceholder")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-dim)]">{t("selectAdAccount")}</label>
            <select
              value={state.adAccountId}
              onChange={(e) => patch({ adAccountId: e.target.value })}
              disabled={!state.clientSlug || accountsLoading}
              className="ui-select mt-1 w-full"
            >
              <option value="">{t("selectAdAccountPlaceholder")}</option>
              {accounts.map((a) => (
                <option key={a.metaAdAccountId} value={a.metaAdAccountId}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {currentStep === "objective" ? (
        <div className="ui-card p-5">
          <ObjectiveSelector
            buyingType={state.buyingType}
            objective={state.objective}
            onBuyingTypeChange={(bt) => patch({ buyingType: bt })}
            onObjectiveChange={(obj: CampaignObjectiveKey) =>
              patch(applyDefaultConversionForObjective(state, obj))
            }
          />
        </div>
      ) : null}

      {currentStep === "audience" ? <AiAudienceStep state={state} onChange={patch} /> : null}
      {currentStep === "regions" ? <AiRegionsField state={state} onChange={patch} /> : null}
      {currentStep === "offer" ? <AiOfferDestinationStep state={state} onChange={patch} /> : null}
      {currentStep === "summary" ? (
        <AiWizardSummaryStep
          state={state}
          locale={locale}
          generating={generating}
          onChange={patch}
          onGenerate={() => void runGenerate()}
          onBack={goBack}
        />
      ) : null}

      {error ? (
        <div className="ui-alert-warning">
          <p>{error}</p>
        </div>
      ) : null}

      {currentStep !== "summary" ? (
        <div className="flex justify-between gap-2">
          <button
            type="button"
            className="ui-btn-secondary inline-flex items-center gap-1"
            disabled={stepIndex === 0}
            onClick={goBack}
          >
            <ChevronLeft size={16} />
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            className="ui-btn-brand inline-flex items-center gap-1"
            disabled={!canAdvanceFrom(currentStep)}
            onClick={goNext}
          >
            {t("next")}
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}

      <AiCampaignGenerationOverlay open={generating} step={genStep} />
    </div>
  );
}
