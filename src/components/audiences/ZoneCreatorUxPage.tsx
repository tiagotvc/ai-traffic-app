"use client";

import { useRef, useState } from "react";
import { Brain, ChevronLeft, ChevronRight, MapPin, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { AiZoneForm, type AiZoneFormHandle } from "@/components/audiences/create/AiZoneForm";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { Link, useRouter } from "@/i18n/navigation";
import { UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

const STEPS = [
  { id: "brief", labelKey: "zoneStepBrief" },
  { id: "review", labelKey: "zoneStepReview" }
] as const;

export function ZoneCreatorUxPage() {
  const t = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");
  const router = useRouter();
  const formRef = useRef<AiZoneFormHandle>(null);
  const [step, setStep] = useState<(typeof STEPS)[number]["id"]>("brief");

  const currentIdx = STEPS.findIndex((s) => s.id === step);

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

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] gap-x-8 overflow-hidden px-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:pl-8 lg:pr-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="campaign-creator-stepper-row col-start-1 row-start-1 flex shrink-0 items-center gap-3 border-b border-[var(--border-color)] py-2 lg:gap-4 lg:py-1.5">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="campaign-creator-stepper w-full lg:max-w-md">
              <UxHorizontalStepper
                size="mini"
                steps={STEPS.map((s, i) => ({ number: i + 1, label: t(s.labelKey) }))}
                current={currentIdx + 1}
                onStepClick={(n) => {
                  if (n <= currentIdx + 1) setStep(STEPS[n - 1]!.id);
                }}
              />
            </div>
          </div>
        </div>

        <main className="campaign-creator-main-scroll relative col-start-1 row-start-2 flex min-h-0 min-w-0 w-full flex-col overflow-y-auto py-3">
          <div className="campaign-creator-main-scroll__inner mx-auto w-full max-w-xl pb-6">
            <AiZoneForm
              ref={formRef}
              embedded
              shellMode
              onClose={() => router.push("/audiences/zones")}
              onSaved={() => {
                router.push("/audiences/zones");
                router.refresh();
              }}
            />
          </div>
        </main>

        <aside className="campaign-creator-sidebar hidden min-h-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col lg:overflow-hidden">
          <div className="campaign-creator-sidebar__scroll min-h-0 flex-1 overflow-y-auto">
            <div className="campaign-creator-sidebar__inner space-y-3 py-1">
              <div className="campaign-creator-sidebar-card">
                <p className="campaign-creator-orion-section-label mb-2 inline-flex items-center gap-1.5">
                  <Brain size={12} className="text-[var(--ui-accent)]" aria-hidden />
                  Orion Brain
                </p>
                <p className="text-xs leading-relaxed text-[var(--text-dim)]">{t("zoneCreatorBrainTip")}</p>
              </div>
              <div className="ui-wizard-nav--sidebar">
                <div className="ui-wizard-nav__actions">
                  <button
                    type="button"
                    onClick={() => (step === "brief" ? router.push("/audiences/zones") : setStep("brief"))}
                    className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                    {tCc("modalCancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => formRef.current?.save()}
                    className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-heading font-semibold"
                  >
                    <Sparkles size={14} />
                    {t("zoneSaveChanges")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="campaign-creator-footer-outer shrink-0 lg:hidden">
        <div className="campaign-creator-footer-band">
          <div className="ui-wizard-nav--footer">
            <div className="ui-wizard-nav__actions">
              <button type="button" onClick={() => router.push("/audiences/zones")} className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium">
                <ChevronLeft size={16} strokeWidth={2.5} />
                {tCc("modalCancel")}
              </button>
              <button type="button" onClick={() => formRef.current?.save()} className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-heading font-semibold">
                {t("zoneSaveChanges")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
