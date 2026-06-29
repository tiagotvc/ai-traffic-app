"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  AiZoneForm,
  type AiZoneFormActionState,
  type AiZoneFormHandle
} from "@/components/audiences/create/AiZoneForm";
import {
  macroStepForZoneSection,
  nextZoneSection,
  prevZoneSection,
  ZONE_SECTION_META,
  ZONE_SECTION_ORDER,
  type ZoneCreatorSectionKey
} from "@/components/audiences/create/zone-creator-steps";
import { ZoneCreatorBrainTips } from "@/components/audiences/create/ZoneCreatorBrainTips";
import { ZoneCreatorSidebarProgressCard } from "@/components/audiences/create/ZoneCreatorSidebarProgressCard";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { Link, useRouter } from "@/i18n/navigation";
import { UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

const MACRO_STEPS = [
  { id: "briefing", labelKey: "zoneMacroBriefing" },
  { id: "resolve", labelKey: "zoneMacroResolve" },
  { id: "review", labelKey: "zoneMacroReview" }
] as const;

function ZoneWizardNav({
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

export function ZoneCreatorUxPage() {
  const t = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");
  const router = useRouter();
  const formRef = useRef<AiZoneFormHandle>(null);
  const [zoneSection, setZoneSection] = useState<ZoneCreatorSectionKey>("brief");
  const [maxReachedIdx, setMaxReachedIdx] = useState(0);
  const [actionState, setActionState] = useState<AiZoneFormActionState>({
    canSave: false,
    canClear: false,
    pending: false,
    promptReady: false,
    hasPreview: false,
    hasGeoRules: false
  });

  const handleActionStateChange = useCallback((state: AiZoneFormActionState) => {
    setActionState(state);
  }, []);

  const currentIdx = ZONE_SECTION_ORDER.indexOf(zoneSection);
  const macroCurrent = macroStepForZoneSection(zoneSection);
  const activeSectionMeta = ZONE_SECTION_META[zoneSection];
  const isReviewStep = zoneSection === "review";

  const stepPercent = Math.round(((currentIdx + 1) / ZONE_SECTION_ORDER.length) * 100);

  const sectionComplete =
    zoneSection === "brief"
      ? actionState.hasPreview
      : zoneSection === "places"
        ? actionState.hasGeoRules
        : true;

  const canNext =
    !isReviewStep &&
    !actionState.pending &&
    (zoneSection === "brief"
      ? actionState.promptReady
      : zoneSection === "places"
        ? actionState.hasPreview
        : false);

  useEffect(() => {
    if (zoneSection === "brief" && actionState.hasPreview && !actionState.pending) {
      const next = nextZoneSection("brief");
      if (next) {
        setZoneSection(next);
        setMaxReachedIdx((prev) => Math.max(prev, ZONE_SECTION_ORDER.indexOf(next)));
      }
    }
  }, [zoneSection, actionState.hasPreview, actionState.pending]);

  useEffect(() => {
    if (zoneSection === "places" && actionState.hasGeoRules && !actionState.pending) {
      const next = nextZoneSection("places");
      if (next) {
        setZoneSection(next);
        setMaxReachedIdx((prev) => Math.max(prev, ZONE_SECTION_ORDER.indexOf(next)));
      }
    }
  }, [zoneSection, actionState.hasGeoRules, actionState.pending]);

  const goToSection = (key: ZoneCreatorSectionKey) => {
    const idx = ZONE_SECTION_ORDER.indexOf(key);
    if (idx <= maxReachedIdx) setZoneSection(key);
  };

  const goNext = () => {
    if (zoneSection === "brief" && !actionState.hasPreview) {
      formRef.current?.runPreview();
      return;
    }
    if (zoneSection === "places" && !actionState.hasGeoRules) {
      formRef.current?.geocode();
      return;
    }

    const next = nextZoneSection(zoneSection);
    if (next) {
      setZoneSection(next);
      setMaxReachedIdx((prev) => Math.max(prev, ZONE_SECTION_ORDER.indexOf(next)));
    }
  };

  const goPrev = () => {
    const prev = prevZoneSection(zoneSection);
    if (!prev) {
      router.push("/audiences/zones");
      return;
    }
    setZoneSection(prev);
  };

  const handleSave = () => {
    formRef.current?.save();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="campaign-creator-header shrink-0 px-4 pb-3 pt-3 lg:pl-8 lg:pr-4 lg:pb-4 lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <PageTitleBlock
            className="flex-1"
            title={t("zoneCreatorTitle")}
            subtitle={
              <>
                <Link href="/audiences/zones" className="hover:underline">
                  {t("zonesLibraryTitle")}
                </Link>
                {" › "}
                {t("newZone")}
              </>
            }
            titleIcon={<MapPin size={16} aria-hidden />}
          />
          <button
            type="button"
            onClick={() => router.push("/audiences/zones")}
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
                  const target = ZONE_SECTION_ORDER.find((k) => macroStepForZoneSection(k) === n);
                  if (target && macroStepForZoneSection(zoneSection) >= n) goToSection(target);
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
                  <div className="campaign-creator-step-scroll min-h-0 flex-1 overflow-y-auto pt-5 pb-2">
                    <div className="campaign-creator-section-stack space-y-4">
                      {activeSectionMeta ? (
                        <div>
                          <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                            {t(activeSectionMeta.titleKey)}
                          </h2>
                          <p className="mt-1 text-xs text-[var(--text-dim)]">
                            {t(activeSectionMeta.hintKey)}
                          </p>
                        </div>
                      ) : null}

                      <AiZoneForm
                        ref={formRef}
                        embedded
                        shellMode
                        zoneSection={zoneSection}
                        onClose={() => router.push("/audiences/zones")}
                        onSaved={() => {
                          router.push("/audiences/zones");
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
                <ZoneCreatorSidebarProgressCard
                  stepPercent={stepPercent}
                  promptReady={actionState.promptReady}
                  hasPreview={actionState.hasPreview}
                  hasGeoRules={actionState.hasGeoRules}
                />
                <ZoneCreatorBrainTips zoneSection={zoneSection} />
              </div>
            </div>
            <div className="campaign-creator-sidebar-footer shrink-0">
              <ZoneWizardNav
                placement="sidebar"
                onBack={goPrev}
                onNext={goNext}
                onSave={handleSave}
                showNext={!isReviewStep}
                showSave={isReviewStep}
                nextDisabled={!canNext}
                saveDisabled={!actionState.canSave}
                backLabel={tCc("back")}
                nextLabel={
                  zoneSection === "brief" && !actionState.hasPreview
                    ? t("previewZone")
                    : zoneSection === "places" && !actionState.hasGeoRules
                      ? t("geocodeZone")
                      : tCc("next")
                }
                saveLabel={t("saveZone")}
              />
            </div>
          </div>
        </aside>
      </div>

      <div className="campaign-creator-footer-outer shrink-0 lg:hidden">
        <div className="campaign-creator-footer-band">
          <ZoneWizardNav
            placement="footer"
            onBack={goPrev}
            onNext={goNext}
            onSave={handleSave}
            showNext={!isReviewStep}
            showSave={isReviewStep}
            nextDisabled={!canNext}
            saveDisabled={!actionState.canSave}
            backLabel={tCc("back")}
            nextLabel={
              zoneSection === "brief" && !actionState.hasPreview
                ? t("previewZone")
                : zoneSection === "places" && !actionState.hasGeoRules
                  ? t("geocodeZone")
                  : tCc("next")
            }
            saveLabel={t("saveZone")}
          />
        </div>
      </div>
    </div>
  );
}
