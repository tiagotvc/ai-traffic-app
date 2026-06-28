"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, ShieldOff, Sparkles, Tag, Target, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { AiPersonaForm } from "@/components/audiences/create/AiPersonaForm";
import type { AiAudienceTargetingFormHandle } from "@/components/audiences/create/AiAudienceTargetingForm";
import type { PersonaCreatorSectionKey } from "@/components/audiences/create/persona-creator-steps";
import {
  macroStepForSection,
  nextPersonaSection,
  PERSONA_MACRO_SECTIONS,
  PERSONA_SECTION_META,
  PERSONA_SECTION_ORDER,
  prevPersonaSection
} from "@/components/audiences/create/persona-creator-steps";
import { DsChoiceCard } from "@/design-system";
import { cn } from "@/lib/cn";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { Link, useRouter } from "@/i18n/navigation";
import { PersonaCreatorBrainTips } from "@/components/audiences/create/PersonaCreatorBrainTips";
import { PersonaCreatorSidebarProgressCard } from "@/components/audiences/create/PersonaCreatorSidebarProgressCard";
import { PersonaCreatorSummaryModal } from "@/components/audiences/create/PersonaCreatorSummaryModal";
import {
  PersonaCreatorScoreProvider,
  usePersonaCreatorScore
} from "@/components/audiences/create/PersonaCreatorScoreContext";
import {
  buildPersonaDraftScoreChecklist,
  EMPTY_PERSONA_DRAFT_SCORE_INPUT
} from "@/lib/persona-draft-score";
import type { AiAudienceTargetingFormActionState } from "@/components/audiences/create/AiAudienceTargetingForm";
import { UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

const MACRO_STEPS = [
  { id: "briefing", labelKey: "personaMacroBriefing" },
  { id: "refinement", labelKey: "personaMacroRefinement" },
  { id: "review", labelKey: "personaMacroReview" }
] as const;

const SECTION_ICONS: Record<PersonaCreatorSectionKey, ReactNode> = {
  identity: <Sparkles size={18} />,
  commercial: <Tag size={18} />,
  launch: <Target size={18} />,
  refinement: <ShieldOff size={18} />,
  preview: <Eye size={18} />
};

function sectionCardCount(count: number) {
  if (count >= 4) return "campaign-creator-choice-cards--4";
  if (count === 3) return "campaign-creator-choice-cards--3";
  return "campaign-creator-choice-cards--2";
}

function isSectionVisited(sectionIdx: number, currentIdx: number) {
  return sectionIdx < currentIdx;
}

function PersonaWizardNav({
  onBack,
  onNext,
  onSave,
  showNext,
  showSave,
  nextDisabled,
  saveDisabled,
  backLabel,
  nextLabel,
  saveLabel,
  placement
}: {
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  showNext: boolean;
  showSave: boolean;
  nextDisabled: boolean;
  saveDisabled: boolean;
  backLabel: string;
  nextLabel: string;
  saveLabel: string;
  placement: "sidebar" | "footer";
}) {
  const wrapperClass = placement === "sidebar" ? "ui-wizard-nav--sidebar" : "ui-wizard-nav--footer";

  return (
    <div className={wrapperClass}>
      <div className="ui-wizard-nav__actions">
        <button
          type="button"
          onClick={onBack}
          className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
          {backLabel}
        </button>
        {showNext ? (
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nextLabel}
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        ) : showSave ? (
          <button
            type="button"
            disabled={saveDisabled}
            onClick={onSave}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={14} />
            {saveLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PersonaCreatorUxPage() {
  return (
    <PersonaCreatorScoreProvider>
      <PersonaCreatorUxPageContent />
    </PersonaCreatorScoreProvider>
  );
}

function PersonaCreatorUxPageContent() {
  const t = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isManual = searchParams.get("mode") === "manual";
  const { score, scoreInput } = usePersonaCreatorScore();
  const formRef = useRef<AiAudienceTargetingFormHandle>(null);
  const [personaSection, setPersonaSection] = useState<PersonaCreatorSectionKey>("identity");
  const [maxReachedIdx, setMaxReachedIdx] = useState(0);
  const [clientSlug, setClientSlug] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveDisabled, setSaveDisabled] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const handleActionStateChange = useCallback((state: AiAudienceTargetingFormActionState) => {
    setSaveDisabled(!state.canSave);
  }, []);

  const currentIdx = PERSONA_SECTION_ORDER.indexOf(personaSection);
  const macroCurrent = macroStepForSection(personaSection);
  const visibleSectionCards = macroCurrent === 1 ? PERSONA_MACRO_SECTIONS[1] : [];
  const activeSectionMeta = PERSONA_SECTION_META[personaSection];

  useEffect(() => {
    fetch("/api/audiences/hub")
      .then((r) => r.json())
      .then(
        (j: {
          clients?: Array<{
            slug: string;
            defaultAdAccountId: string | null;
            adAccounts: { metaAdAccountId: string }[];
          }>;
        }) => {
          const first = j.clients?.find((c) => c.defaultAdAccountId || c.adAccounts.length > 0);
          if (!first) return;
          setClientSlug(first.slug);
          setAdAccountId(first.defaultAdAccountId ?? first.adAccounts[0]?.metaAdAccountId ?? "");
        }
      )
      .catch(() => {});
  }, []);

  const stepPercent = Math.round(((currentIdx + 1) / PERSONA_SECTION_ORDER.length) * 100);

  const isReviewStep = personaSection === "preview";
  // Validação por passo: só libera "Próximo" com os campos obrigatórios da seção preenchidos.
  const navChecklist = buildPersonaDraftScoreChecklist(scoreInput ?? EMPTY_PERSONA_DRAFT_SCORE_INPUT);
  const sectionComplete =
    personaSection === "identity"
      ? navChecklist.demographics
      : personaSection === "commercial"
        ? navChecklist.business && navChecklist.profile
        : personaSection === "launch"
          ? navChecklist.behaviors && navChecklist.lifestyle
          : personaSection === "refinement"
            ? navChecklist.exclusions
            : true;
  const canNext = !isReviewStep && sectionComplete;

  const goToSection = (key: PersonaCreatorSectionKey) => {
    const idx = PERSONA_SECTION_ORDER.indexOf(key);
    if (idx <= maxReachedIdx) setPersonaSection(key);
  };

  const goNext = () => {
    const next = nextPersonaSection(personaSection);
    if (next) {
      setPersonaSection(next);
      setMaxReachedIdx((prev) => Math.max(prev, PERSONA_SECTION_ORDER.indexOf(next)));
    }
  };

  const goPrev = () => {
    const prev = prevPersonaSection(personaSection);
    if (!prev) {
      router.push("/audiences/personas");
      return;
    }
    setPersonaSection(prev);
  };

  const handleSave = () => {
    formRef.current?.save();
  };

  const resolvedScoreInput = scoreInput ?? EMPTY_PERSONA_DRAFT_SCORE_INPUT;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="campaign-creator-header shrink-0 px-4 pb-3 pt-3 lg:pl-8 lg:pr-4 lg:pb-4 lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <PageTitleBlock
            className="flex-1"
            title={t("personaCreatorTitle")}
            subtitle={
              <>
                <Link href="/audiences/personas" className="hover:underline">
                  {t("personasLibraryTitle")}
                </Link>
                {" › "}
                {isManual ? t("personaCreateFromScratch") : t("newPersona")}
              </>
            }
            titleIcon={<Users size={16} aria-hidden />}
            badge={
              isManual ? undefined : (
              <span
                className="rounded-full px-2.5 py-0.5 font-heading text-[11px] font-semibold lg:text-xs"
                style={{
                  background: "var(--ui-accent-muted)",
                  color: "var(--ui-accent)",
                  border: "1px solid var(--ui-accent-border)"
                }}
              >
                {t("personaAureumBadge")}
              </span>
              )
            }
          />
          <button
            type="button"
            onClick={() => router.push("/audiences/personas")}
            aria-label={tCc("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 lg:h-8 lg:w-8"
          >
            <X size={20} strokeWidth={2} className="text-[var(--text-dim)]" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] gap-x-8 overflow-x-visible overflow-y-hidden px-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:pl-8 lg:pr-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="campaign-creator-stepper-row col-start-1 row-start-1 flex shrink-0 items-center gap-3 border-b border-[var(--border-color)] py-2 lg:gap-4 lg:py-1.5">
          <div className="min-w-0 flex-1 overflow-x-auto px-4">
            <div className="campaign-creator-stepper w-full max-w-full lg:w-fit">
              <UxHorizontalStepper
                size="mini"
                steps={MACRO_STEPS.map((s, i) => ({
                  number: i + 1,
                  label: t(s.labelKey),
                  disabled: macroCurrent < i + 1
                }))}
                current={macroCurrent}
                onStepClick={(n) => {
                  const target = PERSONA_SECTION_ORDER.find((k) => macroStepForSection(k) === n);
                  if (target && macroStepForSection(personaSection) >= n) goToSection(target);
                }}
              />
            </div>
          </div>
        </div>

        <main className="relative col-start-1 row-start-2 flex min-h-0 min-w-0 w-full flex-col overflow-x-visible overflow-y-hidden py-3">
          <div className="campaign-creator-main-scroll flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-visible overflow-y-auto lg:overflow-y-hidden">
            <div className="campaign-creator-main-scroll__inner flex min-h-0 min-w-0 w-full flex-1 flex-col">
              <div className="campaign-creator-step-panel flex min-h-0 min-w-0 w-full flex-1 flex-col">
                <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
                  {visibleSectionCards.length > 0 ? (
                    <div className="campaign-creator-step-sticky-header space-y-3">
                      <div>
                        <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                          {t(MACRO_STEPS[macroCurrent - 1]!.labelKey)}
                        </h2>
                        <p className="mt-1 hidden text-xs text-[var(--text-dim)] sm:block">
                          {activeSectionMeta ? t(activeSectionMeta.hintKey) : null}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "campaign-creator-choice-cards",
                          sectionCardCount(visibleSectionCards.length)
                        )}
                      >
                        {visibleSectionCards.map((sectionKey) => {
                          const meta = PERSONA_SECTION_META[sectionKey];
                          const sectionIdx = PERSONA_SECTION_ORDER.indexOf(sectionKey);
                          const isActive = personaSection === sectionKey;
                          const reachable = sectionIdx <= maxReachedIdx;
                          const visited = isSectionVisited(sectionIdx, currentIdx);
                          return (
                            <DsChoiceCard
                              key={sectionKey}
                              layout="inline"
                              title={t(meta.titleKey)}
                              description={t(meta.hintKey)}
                              icon={SECTION_ICONS[sectionKey]}
                              accent={isActive}
                              muted={!visited && !isActive}
                              visited={visited && !isActive}
                              onClick={() => goToSection(sectionKey)}
                              className={!reachable ? "pointer-events-none" : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="campaign-creator-step-scroll min-h-0 flex-1 overflow-y-auto pt-5 pb-2">
                    {error ? <div className="ui-alert-danger mb-4 text-sm">{error}</div> : null}

                    <div className="campaign-creator-section-stack space-y-4">
                      {activeSectionMeta && personaSection !== "preview" ? (
                        <div>
                          <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                            {t(activeSectionMeta.titleKey)}
                          </h2>
                        </div>
                      ) : null}

                      <AiPersonaForm
                        ref={formRef}
                        clientSlug={clientSlug}
                        adAccountId={adAccountId}
                        embedded
                        shellMode
                        manualMode={isManual}
                        personaSection={personaSection}
                        onClose={() => router.push("/audiences/personas")}
                        onSaved={() => {
                          router.push("/audiences/personas");
                          router.refresh();
                        }}
                        onActionStateChange={handleActionStateChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="campaign-creator-sidebar hidden min-h-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col lg:overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="campaign-creator-sidebar__scroll min-h-0 flex-1 overflow-y-auto">
              <div className="campaign-creator-sidebar__inner space-y-3 py-1">
                <PersonaCreatorSidebarProgressCard
                  score={score}
                  scoreInput={scoreInput}
                  manualMode={isManual}
                  stepPercent={stepPercent}
                  onOpenSummary={() => setSummaryOpen(true)}
                />

                <PersonaCreatorBrainTips
                  personaSection={personaSection}
                  macroStep={macroCurrent}
                  manualMode={isManual}
                  scoreInput={resolvedScoreInput}
                  score={score}
                />
              </div>
            </div>
            <div className="campaign-creator-sidebar-footer shrink-0">
              <PersonaWizardNav
                placement="sidebar"
                onBack={goPrev}
                onNext={goNext}
                onSave={handleSave}
                showNext={!isReviewStep}
                showSave={isReviewStep}
                nextDisabled={!canNext}
                saveDisabled={saveDisabled}
                backLabel={tCc("back")}
                nextLabel={tCc("next")}
                saveLabel={t("personaSave")}
              />
            </div>
          </div>
          <PersonaCreatorSummaryModal
            open={summaryOpen}
            onClose={() => setSummaryOpen(false)}
            scoreInput={resolvedScoreInput}
            manualMode={isManual}
          />
        </aside>
      </div>

      <div className="campaign-creator-footer-outer shrink-0 lg:hidden">
        <div className="campaign-creator-footer-band">
          <PersonaWizardNav
            placement="footer"
            onBack={goPrev}
            onNext={goNext}
            onSave={handleSave}
            showNext={!isReviewStep}
            showSave={isReviewStep}
            nextDisabled={!canNext}
            saveDisabled={saveDisabled}
            backLabel={tCc("back")}
            nextLabel={tCc("next")}
            saveLabel={t("personaSave")}
          />
        </div>
      </div>
    </div>
  );
}
