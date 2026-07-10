"use client";

import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Facebook,
  Sparkles
} from "lucide-react";

import { UxScoreItem } from "@/uxpilot-ui/adapters/ux-wizard-primitives";
import type { StepKey, useCreateClientWizard } from "@/uxpilot-ui/adapters/useCreateClientWizard";

type Wizard = ReturnType<typeof useCreateClientWizard>;

const STEP_LABEL_KEY: Record<StepKey, string> = {
  name: "stepName",
  platforms: "stepPlatforms",
  bm: "stepBm",
  accounts: "stepAccounts",
  pagePixels: "stepPagePixels",
  google: "stepGoogle"
};

export function ClientCreateWizardNav({
  w,
  tBack,
  tNext,
  tCreate,
  tCreating,
  goBack,
  onNext,
  onCreate,
  className
}: {
  w: Wizard;
  tBack: string;
  tNext: string;
  tCreate: string;
  tCreating: string;
  goBack: () => void;
  onNext: () => void;
  onCreate: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="ui-wizard-nav__actions">
        <button
          type="button"
          onClick={goBack}
          className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
          {tBack}
        </button>
        {w.isLast ? (
          <button
            type="button"
            disabled={w.isPending || !w.canCreate}
            onClick={onCreate}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={14} />
            {w.isPending ? tCreating : tCreate}
          </button>
        ) : (
          <button
            type="button"
            disabled={!w.canContinueCurrent}
            onClick={onNext}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tNext}
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ClientCreateSidebar({
  w,
  tW,
  goBack,
  onNext,
  onCreate
}: {
  w: Wizard;
  tW: (key: string, values?: Record<string, string | number>) => string;
  goBack: () => void;
  onNext: () => void;
  onCreate: () => void;
}) {
  const scoreCircumference = 2 * Math.PI * 32;
  const scoreOffset = scoreCircumference - (w.score / 100) * scoreCircumference;
  const stepPercent = Math.round(((w.stepIndex + 1) / w.stepCount) * 100);

  const selectedPageName =
    w.wizardPages.find((p) => p.metaPageId === w.selectedPageId)?.name ?? null;
  const selectedGoogleName =
    w.googleAccounts.find((a) => a.id === w.selectedGoogleCustomerId)?.descriptiveName ??
    (w.selectedGoogleCustomerId || null);

  return (
    <aside className="campaign-creator-sidebar hidden min-h-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col lg:overflow-hidden">
      <div className="campaign-creator-sidebar__scroll min-h-0 flex-1 overflow-y-auto">
        <div className="campaign-creator-sidebar__inner space-y-3 py-1">
          <div className="campaign-creator-sidebar-card">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
                {tW("sidebarProgress")}
              </h3>
              <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 font-heading text-[11px] font-semibold text-[var(--ui-accent)]">
                {stepPercent}%
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
                <svg className="h-[4.5rem] w-[4.5rem] -rotate-90" viewBox="0 0 72 72" aria-hidden>
                  <circle
                    cx="36"
                    cy="36"
                    r="32"
                    fill="none"
                    stroke="var(--border-color)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="36"
                    cy="36"
                    r="32"
                    fill="none"
                    stroke="var(--ui-accent)"
                    strokeWidth="5"
                    strokeDasharray={scoreCircumference}
                    strokeDashoffset={scoreOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-heading text-lg font-bold text-[var(--ui-accent)]">
                  {w.score}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-dim)]">
                {tW("sidebarProgressHint")}
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {w.steps.map((key) => (
                <UxScoreItem key={key} label={tW(STEP_LABEL_KEY[key])} done={w.stepDone[key]} />
              ))}
            </div>
          </div>

          <div className="campaign-creator-sidebar-card space-y-3">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {tW("sidebarStatus")}
            </h3>
            <div className="campaign-creator-sidebar-card-inset space-y-2 p-3">
              {w.platforms.has("meta") ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--text-dim)]">
                      <Building2 size={12} aria-hidden />
                      {tW("stepBm")}
                    </span>
                    <span className="truncate font-medium text-[var(--text-main)]">
                      {w.selectedBmName ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--text-dim)]">
                      <CreditCard size={12} aria-hidden />
                      {tW("stepAccounts")}
                    </span>
                    <span className="campaign-creator-review-badge campaign-creator-review-badge--accent">
                      {w.selected.size}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--text-dim)]">
                      <Facebook size={12} aria-hidden />
                      {tW("selectPageRequired")}
                    </span>
                    <span className="truncate font-medium text-[var(--text-main)]">
                      {selectedPageName ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-[var(--text-dim)]">
                      <Sparkles size={12} aria-hidden />
                      {tW("selectPixelsOptional")}
                    </span>
                    <span className="campaign-creator-review-badge campaign-creator-review-badge--neutral">
                      {w.selectedPixelIds.size}
                    </span>
                  </div>
                </>
              ) : null}
              {w.platforms.has("google") ? (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--text-dim)]">
                    <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="#EA4335"
                        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.5 3.4 14.5 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.5H12z"
                      />
                    </svg>
                    {tW("stepGoogle")}
                  </span>
                  <span className="truncate font-medium text-[var(--text-main)]">
                    {selectedGoogleName ?? "—"}
                  </span>
                </div>
              ) : null}
              {w.platforms.size === 0 ? (
                <p className="text-xs text-[var(--text-dimmer)]">{tW("stepPlatformsHint")}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="campaign-creator-sidebar-footer shrink-0">
        <ClientCreateWizardNav
          w={w}
          tBack={tW("back")}
          tNext={tW("next")}
          tCreate={tW("create")}
          tCreating={tW("creating")}
          goBack={goBack}
          onNext={onNext}
          onCreate={onCreate}
          className="ui-wizard-nav--sidebar"
        />
      </div>
    </aside>
  );
}
