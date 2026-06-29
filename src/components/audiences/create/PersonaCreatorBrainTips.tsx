"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FlaskConical, Pause, Play, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PersonaCreatorSectionKey } from "@/components/audiences/create/persona-creator-steps";
import { usePersonaCreatorScoreOptional } from "@/components/audiences/create/PersonaCreatorScoreContext";
import { ResearchPipelineCard } from "@/components/labs/ResearchPipelineCard";
import { usePlatformFeature } from "@/hooks/usePlatformFeature";
import { CampaignCreatorScoreBar } from "@/components/campaign-creator/CampaignCreatorScoreBar";
import { DsModal } from "@/design-system/components/DsModal";
import {
  buildPersonaDraftScoreChecklist,
  type PersonaDraftScoreChecklist,
  type PersonaDraftScoreInput
} from "@/lib/persona-draft-score";

type Props = {
  personaSection: PersonaCreatorSectionKey;
  macroStep: 1 | 2 | 3;
  manualMode: boolean;
  scoreInput: PersonaDraftScoreInput;
  score: number;
};

type TipResolution = {
  key: string;
  values?: Record<string, string | number>;
};

function genderLabelKey(gender: PersonaDraftScoreInput["gender"]): string {
  if (gender === "male") return "aiDemographicGenderMale";
  if (gender === "female") return "aiDemographicGenderFemale";
  return "aiDemographicGenderAll";
}

function demographicsTipValues(input: PersonaDraftScoreInput): Record<string, string | number> {
  return {
    ageMin: input.ageMin,
    ageMax: input.ageMax
  };
}

function resolveManualSectionTip(
  section: PersonaCreatorSectionKey,
  checklist: PersonaDraftScoreChecklist,
  input: PersonaDraftScoreInput
): TipResolution {
  const hasSegments = input.manualSegmentCount > 0;

  if (section === "identity") {
    if (!checklist.demographics) return { key: "personaManualTipIdentityEmpty" };
    return { key: "personaManualTipIdentityDone", values: demographicsTipValues(input) };
  }

  if (section === "commercial") {
    if (!checklist.business) return { key: "personaManualTipNeedBusiness" };
    if (!checklist.profile) return { key: "personaManualTipNeedProfile" };
    return { key: "personaManualTipCommercialDone" };
  }

  if (section === "launch") {
    if (!checklist.behaviors) return { key: "personaManualTipNeedBehaviors" };
    if (!checklist.lifestyle) return { key: "personaManualTipNeedLifestyle" };
    return { key: "personaManualTipLaunchDone" };
  }

  if (section === "refinement") {
    if (!checklist.exclusions) return { key: "personaManualTipPreviewExclusions" };
    if (!hasSegments) return { key: "personaManualTipSearchMeta" };
    return {
      key: "personaManualTipSegmentsAdded",
      values: { count: input.manualSegmentCount }
    };
  }

  if (section === "preview") {
    if (!checklist.finish) return { key: "personaManualTipPreviewName" };
    if (hasSegments) {
      return {
        key: "personaManualTipPreviewReady",
        values: { count: input.manualSegmentCount }
      };
    }
    return { key: "personaManualPreviewHint" };
  }

  return { key: "personaCreateFromScratchHint" };
}

function resolveAiSectionTip(
  section: PersonaCreatorSectionKey,
  checklist: PersonaDraftScoreChecklist,
  input: PersonaDraftScoreInput
): TipResolution {
  if (section === "identity") {
    if (!checklist.demographics) return { key: "personaTipQualidade" };
    if (!checklist.business) {
      return { key: "personaTipIdentityDemographicsDone", values: demographicsTipValues(input) };
    }
    return { key: "personaTipGenero" };
  }

  if (section === "commercial") {
    if (!checklist.business) return { key: "personaTipQualidade" };
    if (!checklist.profile) return { key: "personaTipCommercialNeedProfile" };
    return { key: "personaTipCommercial" };
  }

  if (section === "launch") {
    if (!checklist.behaviors) return { key: "personaTipLaunchNeedBehaviors" };
    if (!checklist.lifestyle) return { key: "personaTipLaunchNeedLifestyle" };
    return { key: "personaTipLaunchReady" };
  }

  if (section === "refinement") {
    if (!checklist.exclusions) return { key: "personaTipRefinement" };
    return { key: "personaTipRefinementDone" };
  }

  if (section === "preview") {
    if (!input.hasPersonaPreview && !input.hasSuggestion) return { key: "personaTipReviewGenerate" };
    if (!checklist.finish && !input.hasSuggestion) return { key: "personaTipPreviewNoSegments" };
    if (!checklist.finish) return { key: "personaTipPreview" };
    return { key: "personaTipPreview" };
  }

  return { key: "personaTipDefault" };
}

function resolveSectionTip(
  section: PersonaCreatorSectionKey,
  manualMode: boolean,
  checklist: PersonaDraftScoreChecklist,
  input: PersonaDraftScoreInput
): TipResolution {
  if (manualMode) return resolveManualSectionTip(section, checklist, input);
  return resolveAiSectionTip(section, checklist, input);
}

function ChecklistItem({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div
      className={
        complete
          ? "campaign-creator-summary-checklist-item campaign-creator-summary-checklist-item--complete"
          : "campaign-creator-summary-checklist-item campaign-creator-summary-checklist-item--incomplete"
      }
    >
      <span className="min-w-0 truncate text-[11px]">{label}</span>
    </div>
  );
}

export function PersonaCreatorBrainTips({
  personaSection,
  macroStep,
  manualMode,
  scoreInput,
  score
}: Props) {
  const tAud = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");
  const insightsCtx = usePersonaCreatorScoreOptional();
  const paused = insightsCtx?.paused ?? false;
  const insightsResult = insightsCtx?.insightsResult ?? null;
  const insightsLoading = insightsCtx?.insightsLoading ?? false;
  const clientSlug = insightsCtx?.clientSlug ?? null;
  const brainEnabled = usePlatformFeature("audiences.brain");
  const researchEnabled = usePlatformFeature("audiences.brain.research");
  const [modalOpen, setModalOpen] = useState(false);

  const checklist = useMemo(() => buildPersonaDraftScoreChecklist(scoreInput), [scoreInput]);
  const tip = useMemo(
    () => resolveSectionTip(personaSection, manualMode, checklist, scoreInput),
    [personaSection, manualMode, checklist, scoreInput]
  );

  const tipText = useMemo(() => {
    const genderKey = genderLabelKey(scoreInput.gender);
    const genderLabel = tCc(genderKey as Parameters<typeof tCc>[0]);
    const values = { ...tip.values, gender: genderLabel };
    if (Object.keys(values).length > 0) {
      return tAud(tip.key as Parameters<typeof tAud>[0], values);
    }
    return tAud(tip.key as Parameters<typeof tAud>[0]);
  }, [tip, scoreInput.gender, tAud, tCc]);

  const macroLabel =
    macroStep === 1
      ? tAud("personaMacroBriefing")
      : macroStep === 2
        ? tAud("personaMacroRefinement")
        : tAud("personaMacroReview");

  function togglePaused() {
    insightsCtx?.setPaused(!paused);
  }

  function scrollToMetaSegments() {
    document
      .querySelector("[data-persona-meta-segments]")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const showMetaSearchCta =
    manualMode &&
    personaSection === "refinement" &&
    scoreInput.manualSegmentCount === 0 &&
    checklist.exclusions;

  const missingItems = [
    !checklist.demographics && tAud("personaScoreCheckDemographics"),
    !checklist.business && tCc("aiAudienceBusiness"),
    !checklist.profile && tCc("aiAudienceProfile"),
    !checklist.behaviors && tCc("aiAudienceBehaviors"),
    !checklist.lifestyle && tCc("aiAudienceLifestyle"),
    !checklist.exclusions && tCc("aiAudienceExclusions"),
    !checklist.finish &&
      (manualMode ? tAud("personaManualName") : tAud("personaStepPreview"))
  ].filter(Boolean) as string[];

  if (!brainEnabled) return null;

  return (
    <>
      <div className="campaign-creator-sidebar-card" data-orion-brain-tips>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
              <Sparkles size={15} strokeWidth={2.25} />
            </span>
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {tCc("brainTipsTitle")}
            </h3>
          </div>
          <button
            type="button"
            onClick={togglePaused}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--creator-card-border,var(--border-color))] px-2 py-1 text-[10px] font-medium text-[var(--text-dim)] transition-colors hover:bg-[var(--creator-card-bg-inset,var(--surface-bg))] hover:text-[var(--text-main)]"
            aria-pressed={paused}
            title={paused ? tCc("brainResume") : tCc("brainPause")}
          >
            {paused ? <Play size={12} strokeWidth={2.25} /> : <Pause size={12} strokeWidth={2.25} />}
            {paused ? tCc("brainResume") : tCc("brainPause")}
          </button>
        </div>

        {paused ? (
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-dim)]">{tCc("brainPausedHint")}</p>
        ) : (
          <>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
              {macroLabel}
            </p>
            <div className="campaign-creator-sidebar-card-inset mt-2 px-3.5 py-3">
              <p className="text-xs leading-relaxed text-[var(--text-main)]">{tipText}</p>
            </div>

            {showMetaSearchCta ? (
              <button
                type="button"
                onClick={scrollToMetaSegments}
                className="ui-btn-accent-outline mt-2 inline-flex w-full items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-heading font-semibold"
              >
                {tAud("personaManualMetaSearchCta")}
                <ChevronRight size={12} strokeWidth={2.5} />
              </button>
            ) : null}

            {missingItems.length > 0 && score < 100 ? (
              <div className="mt-3">
                <p className="text-[10px] font-medium text-[var(--text-dimmer)]">
                  {tAud("personaBrainMissingLabel")}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {missingItems.slice(0, 3).map((item) => (
                    <li key={item} className="text-[11px] text-[var(--text-dim)]">
                      · {item}
                    </li>
                  ))}
                  {missingItems.length > 3 ? (
                    <li className="text-[11px] text-[var(--text-dimmer)]">
                      {tAud("personaBrainMissingMore", { count: missingItems.length - 3 })}
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <div className="mt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-[var(--text-dimmer)]">{tAud("personaScore")}</span>
                <span className="text-xs font-semibold text-[var(--text-main)]">{score}%</span>
              </div>
              <div className="mt-2">
                <CampaignCreatorScoreBar value={score} />
              </div>
            </div>

            {insightsResult || insightsLoading ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-[var(--creator-card-border,var(--border-color))]">
                <div className="flex items-center gap-2 bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 px-3 py-2">
                  <FlaskConical
                    size={14}
                    className={`text-white ${insightsLoading ? "animate-pulse" : ""}`}
                    aria-hidden
                  />
                  <span className="text-[11px] font-semibold text-white">Marketing Scientist</span>
                  {insightsLoading ? (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-white/90">
                      <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                      Pesquisando o mercado…
                    </span>
                  ) : null}
                </div>
                <div className="px-3 py-2.5">
                {insightsLoading && !insightsResult ? (
                  <p className="text-[11px] text-[var(--text-dim)]">{tAud("piAnalyzing")}</p>
                ) : insightsResult ? (
                  <>
                    {insightsResult.ai ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[var(--text-dim)]">{tAud("piScore")}</span>
                        <span className="text-xs font-semibold text-[var(--text-main)]">
                          {insightsResult.ai.coherenceScore}/100
                        </span>
                      </div>
                    ) : null}
                    {insightsResult.ai?.summary ? (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-main)]">
                        {insightsResult.ai.summary}
                      </p>
                    ) : null}
                    {insightsResult.demographics?.bestAge ? (
                      <p className="mt-1 text-[11px] text-[var(--text-dim)]">
                        {tAud("piBestAge")}: {insightsResult.demographics.bestAge}
                      </p>
                    ) : null}
                    {insightsResult.segments.invalid.length ? (
                      <p className="mt-1 text-[11px] text-[var(--amber-bright)]">
                        {tAud("piInvalidSegments", { count: insightsResult.segments.invalid.length })}
                      </p>
                    ) : null}
                    {insightsResult.ai?.recommendations?.slice(0, 2).map((r, i) => (
                      <p key={i} className="mt-1 text-[11px] leading-snug text-[var(--text-dim)]">
                        · {r.title}
                      </p>
                    ))}
                  </>
                ) : null}
                </div>
              </div>
            ) : null}

            {clientSlug && researchEnabled ? (
              <div className="mt-3">
                <ResearchPipelineCard
                  scope="persona"
                  signature={clientSlug}
                  title="Pesquisa Orion"
                  requestBody={{ clientSlug, persistHypotheses: true }}
                />
              </div>
            ) : null}

            <button
              type="button"
              data-orion-brain-open
              onClick={() => setModalOpen(true)}
              className="ui-btn-accent-outline mt-3 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-heading font-semibold"
            >
              {tAud("personaBrainViewGuidance")}
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      <DsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={tCc("brainTipsTitle")}
        subtitle={tAud("personaBrainModalSubtitle")}
        titleIcon={<Sparkles size={15} strokeWidth={2.25} />}
        width="md"
      >
        <div className="space-y-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {tAud("personaBrainCurrentSection")}
            </h3>
            <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">
              {tAud(PERSONA_SECTION_TITLE[personaSection])}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-dim)]">{tipText}</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {tCc("summarySectionChecklist")}
            </h3>
            <div className="campaign-creator-summary-checklist-grid mt-3">
              <ChecklistItem
                label={tAud("personaScoreCheckDemographics")}
                complete={checklist.demographics}
              />
              <ChecklistItem label={tCc("aiAudienceBusiness")} complete={checklist.business} />
              <ChecklistItem label={tCc("aiAudienceProfile")} complete={checklist.profile} />
              <ChecklistItem label={tCc("aiAudienceBehaviors")} complete={checklist.behaviors} />
              <ChecklistItem label={tCc("aiAudienceLifestyle")} complete={checklist.lifestyle} />
              <ChecklistItem label={tCc("aiAudienceExclusions")} complete={checklist.exclusions} />
              <ChecklistItem
                label={manualMode ? tAud("personaManualName") : tAud("personaStepPreview")}
                complete={checklist.finish}
              />
            </div>
          </section>

          {!manualMode ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {tAud("personaBrainAiMode")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-dim)]">
                {tAud("personaCreateAiHint")}
              </p>
            </section>
          ) : null}
        </div>
      </DsModal>
    </>
  );
}

const PERSONA_SECTION_TITLE: Record<PersonaCreatorSectionKey, string> = {
  identity: "personaSectionIdentityTitle",
  commercial: "personaSectionCommercialTitle",
  launch: "personaSectionLaunchTitle",
  refinement: "personaSectionRefinementTitle",
  preview: "personaStepPreview"
};
