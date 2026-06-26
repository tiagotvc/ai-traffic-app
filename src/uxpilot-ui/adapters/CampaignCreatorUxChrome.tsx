"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { Link } from "@/i18n/navigation";
import {
  nextNode,
  prevNode,
  validateAdSetStep,
  validateAdStep,
  validateCampaignStep,
  validatePublishDraft,
  computeDraftScore,
  type CreatorNode
} from "@/lib/campaign-draft";
import { UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

const NODE_ORDER: CreatorNode[] = ["campaign", "adset", "ad", "review"];

type StepDef = { number: number; label: string; node: CreatorNode | null; disabled?: boolean };

export function computeWizardProgressPercent(options: {
  onObjectivePhase: boolean;
  addAdMode: boolean;
  activeNode: CreatorNode;
}): number {
  const { onObjectivePhase, addAdMode, activeNode } = options;

  if (onObjectivePhase) return 20;

  if (addAdMode) {
    return activeNode === "review" ? 100 : 50;
  }

  const stepByNode: Record<CreatorNode, number> = {
    campaign: 2,
    adset: 3,
    ad: 4,
    review: 5
  };

  return Math.min(100, Math.round(((stepByNode[activeNode] ?? 2) / 5) * 100));
}

function useCloseHref() {
  const { payload, addAdMode } = useCampaignDraft();
  return addAdMode && payload.meta?.targetMetaCampaignId
    ? `/campaigns/${payload.meta.targetMetaCampaignId}/ads${
        payload.clientSlug ? `?client=${encodeURIComponent(payload.clientSlug)}` : ""
      }`
    : "/campaigns";
}

function formatSavedLabel(lastSavedAt: Date, t: ReturnType<typeof useTranslations<"campaignCreator">>) {
  const minutes = Math.max(0, Math.floor((Date.now() - lastSavedAt.getTime()) / 60_000));
  if (minutes < 1) return t("savedJustNow");
  return t("savedAgo", { minutes });
}

function useStepValidationError(onObjectivePhase: boolean) {
  const { payload, activeNode, addAdMode } = useCampaignDraft();

  if (onObjectivePhase) return null;

  if (addAdMode) {
    return activeNode === "ad" ? validatePublishDraft(payload) : null;
  }

  if (activeNode === "campaign") return validateCampaignStep(payload);
  if (activeNode === "adset") return validateAdSetStep(payload);
  if (activeNode === "ad") return validateAdStep(payload);
  return null;
}

function SavedStatus({
  onObjectivePhase,
  saving,
  lastSavedAt,
  stepError,
  compact = false,
  t
}: {
  onObjectivePhase: boolean;
  saving: boolean;
  lastSavedAt: Date | null;
  stepError: string | null;
  compact?: boolean;
  t: ReturnType<typeof useTranslations<"campaignCreator">>;
}) {
  if (onObjectivePhase) return <span className="w-9 shrink-0" aria-hidden />;

  if (stepError) {
    return (
      <span
        className={
          compact
            ? "max-w-[4.5rem] shrink-0 truncate font-body text-[10px] text-red-500"
            : "max-w-[12rem] truncate font-body text-[11px] text-red-500 sm:max-w-xs"
        }
      >
        {t(stepError as Parameters<typeof t>[0])}
      </span>
    );
  }

  if (saving) {
    return (
      <span
        className={`shrink-0 font-body ${compact ? "text-[11px]" : "text-[11px]"}`}
        style={{ color: "var(--text-dimmer)" }}
      >
        {t("saving")}
      </span>
    );
  }

  if (lastSavedAt) {
    return (
      <span
        className={`inline-flex shrink-0 items-center gap-1 font-body ${compact ? "text-[11px]" : "text-[11px]"}`}
        style={{ color: "var(--success)" }}
      >
        <CheckCircle2 size={compact ? 14 : 13} strokeWidth={2.5} />
        {compact ? t("saved") : formatSavedLabel(lastSavedAt, t)}
      </span>
    );
  }

  return <span className="w-9 shrink-0" aria-hidden />;
}

export function CampaignCreatorUxMobileStatusToast({
  onObjectivePhase = false
}: {
  onObjectivePhase?: boolean;
}) {
  const { mobileValidationToast, clearMobileValidationToast } = useCampaignDraft();

  useEffect(() => {
    if (!mobileValidationToast) return;
    const delayMs = mobileValidationToast.variant === "error" ? 5000 : 4000;
    const timer = window.setTimeout(() => clearMobileValidationToast(), delayMs);
    return () => window.clearTimeout(timer);
  }, [mobileValidationToast, clearMobileValidationToast]);

  if (onObjectivePhase || !mobileValidationToast) return null;

  const { variant, message } = mobileValidationToast;
  const alertClass =
    variant === "error"
      ? "ui-alert-danger"
      : variant === "warning"
        ? "ui-alert-warning"
        : "ui-alert-success";

  const Icon = variant === "error" ? AlertCircle : variant === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <div className="campaign-creator-mobile-toast" role="alert" aria-live="assertive">
      <p className={`campaign-creator-mobile-toast__inner campaign-creator-mobile-toast__inner--solid ${alertClass}`}>
        <Icon size={18} strokeWidth={2.25} className="shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 text-left leading-snug">{message}</span>
      </p>
    </div>
  );
}

export function CampaignCreatorUxHeader({ onObjectivePhase = false }: { onObjectivePhase?: boolean }) {
  const t = useTranslations("campaignCreator");
  const { payload, saving, lastSavedAt, addAdMode } = useCampaignDraft();
  const closeHref = useCloseHref();
  const stepError = useStepValidationError(onObjectivePhase);

  const title = onObjectivePhase
    ? t("objectiveModalTitle")
    : addAdMode
      ? t("addAdTitle")
      : t("title");
  const subtitle = onObjectivePhase
    ? t("objectiveModalHint")
    : payload.campaign.name || t("newCampaign");

  return (
    <header className="campaign-creator-header shrink-0 px-4 pb-2 pt-3 lg:pl-8 lg:pr-4 lg:pt-4">
      {/* Mobile — dedicated creator chrome (close · title) */}
      <div className="lg:hidden">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2">
          <Link
            href={closeHref}
            aria-label={t("close")}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-opacity hover:opacity-80"
          >
            <X size={22} strokeWidth={2} style={{ color: "var(--ui-accent)" }} />
          </Link>
          <div className="min-w-0 text-center">
            <h1 className="truncate font-heading text-base font-bold leading-tight" style={{ color: "var(--text-main)" }}>
              {title}
            </h1>
            <p className="mt-0.5 truncate font-body text-xs leading-snug" style={{ color: "var(--text-dim)" }}>
              {subtitle}
            </p>
          </div>
          <span className="w-9 shrink-0" aria-hidden />
        </div>
      </div>

      {/* Desktop — breadcrumb + title row */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-body text-xs leading-relaxed" style={{ color: "var(--text-dimmer)" }}>
            <Link href="/campaigns" className="hover:underline" style={{ color: "var(--text-dimmer)" }}>
              {t("breadcrumbCampaigns")}
            </Link>
            {!onObjectivePhase && payload.campaign.name ? (
              <>
                {" › "}
                <span style={{ color: "var(--text-dim)" }}>{payload.campaign.name}</span>
              </>
            ) : null}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <SavedStatus
              onObjectivePhase={onObjectivePhase}
              saving={saving}
              lastSavedAt={lastSavedAt}
              stepError={stepError}
              t={t}
            />
            <Link
              href={closeHref}
              aria-label={t("close")}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-80"
            >
              <X size={20} strokeWidth={2} style={{ color: "var(--ui-accent)" }} />
            </Link>
          </div>
        </div>
        <div className="mt-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold" style={{ color: "var(--text-main)" }}>
              {title}
            </h1>
            {!onObjectivePhase ? (
              <span
                className="rounded px-2 py-0.5 font-heading text-xs font-semibold"
                style={{
                  background: "var(--ui-accent-muted)",
                  color: "var(--ui-accent)",
                  border: "1px solid var(--ui-accent-border)"
                }}
              >
                {t("draftStatus")}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 font-body text-sm" style={{ color: "var(--text-dim)" }}>
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}

export function CampaignCreatorUxStepper({ onObjectivePhase = false }: { onObjectivePhase?: boolean }) {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, setActiveNode, addAdMode, setObjectiveChosen } = useCampaignDraft();
  const visited = (n: CreatorNode) => payload.visitedNodes.includes(n);

  let steps: StepDef[];
  let current: number;

  if (addAdMode) {
    steps = [
      { number: 1, label: t("treeAd"), node: "ad" },
      { number: 2, label: t("treeReview"), node: "review" }
    ];
    current = activeNode === "review" ? 2 : 1;
  } else if (onObjectivePhase) {
    steps = [
      { number: 1, label: t("objective"), node: null },
      { number: 2, label: t("treeCampaign"), node: "campaign", disabled: true },
      { number: 3, label: t("treeAdset"), node: "adset", disabled: true },
      { number: 4, label: t("treeAd"), node: "ad", disabled: true },
      { number: 5, label: t("treeReview"), node: "review", disabled: true }
    ];
    current = 1;
  } else {
    steps = [
      { number: 1, label: t("objective"), node: null },
      { number: 2, label: t("treeCampaign"), node: "campaign" },
      { number: 3, label: t("treeAdset"), node: "adset" },
      { number: 4, label: t("treeAd"), node: "ad" },
      { number: 5, label: t("treeReview"), node: "review" }
    ];
    const nodeIndex = NODE_ORDER.indexOf(activeNode);
    current = nodeIndex >= 0 ? nodeIndex + 2 : 2;
  }

  const horizontalSteps = steps.map((s) => ({
    number: s.number,
    label: s.label,
    disabled:
      s.number === 1
        ? false
        : s.disabled ??
          (s.node ? !visited(s.node) && activeNode !== s.node : onObjectivePhase ? s.number > 1 : true)
  }));

  function onStepClick(stepNum: number) {
    const step = steps.find((s) => s.number === stepNum);
    if (stepNum === 1 && !onObjectivePhase && !addAdMode) {
      setObjectiveChosen(false);
      return;
    }
    if (!step?.node) return;
    if (visited(step.node) || activeNode === step.node) setActiveNode(step.node);
  }

  return (
    <div className="campaign-creator-stepper w-full lg:max-w-3xl">
      <UxHorizontalStepper
        size="mini"
        steps={horizontalSteps}
        current={current}
        onStepClick={onStepClick}
      />
    </div>
  );
}

/** Indicador compacto de progresso — visível só em mobile/tablet, ao lado do stepper. */
export function CampaignCreatorUxMobileProgress({
  onObjectivePhase = false
}: {
  onObjectivePhase?: boolean;
}) {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, addAdMode, objectiveChosen } = useCampaignDraft();

  if (onObjectivePhase) return null;

  const stepPercent = computeWizardProgressPercent({
    onObjectivePhase: !addAdMode && !objectiveChosen,
    addAdMode,
    activeNode
  });
  const score = computeDraftScore(payload);
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 pt-0.5 lg:hidden"
      aria-label={t("campaignScore")}
    >
      <div className="relative h-9 w-9">
        <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border-color)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="var(--ui-accent)"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-heading text-[10px] font-bold text-[var(--ui-accent)]">
          {score}
        </span>
      </div>
      <span className="font-heading text-[11px] font-semibold text-[var(--ui-accent)]">
        {t("wizardProgress", { percent: stepPercent })}
      </span>
    </div>
  );
}

/** Navegação do criador — rodapé compacto ou inline. */
export function CampaignCreatorUxNav({
  onPublish,
  publishing,
  onObjectivePhase = false,
  placement = "footer"
}: {
  onPublish?: () => void;
  publishing?: boolean;
  onObjectivePhase?: boolean;
  placement?: "floating" | "footer" | "inline";
}) {
  const t = useTranslations("campaignCreator");
  const tCommon = useTranslations("common");
  const { payload, activeNode, setActiveNode, addAdMode, setObjectiveChosen, showMobileValidationToast } =
    useCampaignDraft();

  const err = useStepValidationError(onObjectivePhase);

  const showBack =
    !onObjectivePhase &&
    (addAdMode ? activeNode !== "ad" : true);

  function goNext() {
    if (onObjectivePhase) {
      setObjectiveChosen(true);
      setActiveNode("campaign");
      return;
    }
    if (err) {
      showMobileValidationToast("error", t(err as Parameters<typeof t>[0]));
      return;
    }
    const n = nextNode(activeNode);
    if (n) setActiveNode(n);
  }

  function goPrev() {
    if (!addAdMode && activeNode === "campaign") {
      setObjectiveChosen(false);
      return;
    }
    const p = prevNode(activeNode);
    if (p) setActiveNode(p);
  }

  const wrapperClass =
    placement === "floating"
      ? "ui-wizard-nav--floating"
      : placement === "footer"
        ? "ui-wizard-nav--footer"
        : "mt-6 space-y-3";

  return (
    <div className={wrapperClass}>
      <div
        className={
          placement === "floating" || placement === "footer"
            ? "ui-wizard-nav__actions"
            : `flex items-center gap-2 ${showBack ? "justify-between" : "justify-end"}`
        }
      >
        {showBack ? (
          <button
            type="button"
            onClick={goPrev}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1.5 px-4 text-sm font-heading font-medium lg:px-3"
          >
            <ChevronLeft size={18} strokeWidth={2.5} className="lg:h-4 lg:w-4" />
            {t("back")}
          </button>
        ) : (
          <span className="ui-wizard-nav__btn-spacer" aria-hidden />
        )}
        {onObjectivePhase || activeNode !== "review" ? (
          <button
            type="button"
            onClick={goNext}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1.5 px-5 text-sm font-heading font-semibold lg:px-4"
          >
            {t("next")}
            <ChevronRight size={18} strokeWidth={2.5} className="lg:h-4 lg:w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={publishing}
            onClick={onPublish}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1.5 px-5 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50 lg:px-4"
          >
            {publishing ? tCommon("sending") : addAdMode ? t("publishAd") : t("publish")}
          </button>
        )}
      </div>
    </div>
  );
}
