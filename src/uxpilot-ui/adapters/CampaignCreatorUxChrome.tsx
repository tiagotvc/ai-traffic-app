"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  X
} from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { useAdSetStepSubflowOptional } from "@/components/campaign-creator/AdSetStepSubflowContext";
import { useAdStepSubflowOptional } from "@/components/campaign-creator/AdStepSubflowContext";
import { useCampaignStepSubflowOptional } from "@/components/campaign-creator/CampaignStepSubflowContext";
import { resolveSubflowStepError } from "@/components/campaign-creator/subflow-step-validation";
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
import { resolveCreatorBackNav } from "@/lib/creator-wizard-nav";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

const NODE_ORDER: CreatorNode[] = ["campaign", "adset", "ad", "review"];

type StepDef = { number: number; label: string; node: CreatorNode | null; disabled?: boolean };

export function computeWizardProgressPercent(options: {
  addAdMode: boolean;
  activeNode: CreatorNode;
}): number {
  const { current, total } = computeWizardStepNumber(options);
  return Math.min(100, Math.round((current / total) * 100));
}

export function computeWizardStepNumber(options: {
  addAdMode: boolean;
  activeNode: CreatorNode;
  campaignSection?: "objective" | "budget";
}): { current: number; total: number } {
  const { addAdMode, activeNode, campaignSection } = options;

  if (addAdMode) {
    return { current: activeNode === "review" ? 2 : 1, total: 2 };
  }

  if (activeNode === "campaign" && campaignSection === "objective") {
    return { current: 1, total: 5 };
  }

  const stepByNode: Record<CreatorNode, number> = {
    campaign: 2,
    adset: 3,
    ad: 4,
    review: 5
  };

  return { current: stepByNode[activeNode] ?? 2, total: 5 };
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

function useStepValidationError() {
  const { payload, activeNode, addAdMode } = useCampaignDraft();
  const campaignSubflow = useCampaignStepSubflowOptional();
  const adsetSubflow = useAdSetStepSubflowOptional();
  const adSubflow = useAdStepSubflowOptional();

  if (addAdMode) {
    return activeNode === "ad"
      ? resolveSubflowStepError(adSubflow, () => validatePublishDraft(payload))
      : null;
  }

  if (activeNode === "campaign") {
    return resolveSubflowStepError(campaignSubflow, () => validateCampaignStep(payload));
  }
  if (activeNode === "adset") {
    return resolveSubflowStepError(adsetSubflow, () => validateAdSetStep(payload));
  }
  if (activeNode === "ad") {
    return resolveSubflowStepError(adSubflow, () => validateAdStep(payload));
  }
  return null;
}

type StatusToast = {
  variant: "error" | "warning" | "success";
  message: string;
  key: number;
};

function StatusToastBanner({ toast }: { toast: StatusToast }) {
  const alertClass =
    toast.variant === "error"
      ? "ui-alert-danger"
      : toast.variant === "warning"
        ? "ui-alert-warning"
        : "ui-alert-success";

  const Icon =
    toast.variant === "error" ? AlertCircle : toast.variant === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <div className="campaign-creator-status-toast" role="alert" aria-live="assertive">
      <p
        className={`campaign-creator-status-toast__inner campaign-creator-status-toast__inner--solid ${alertClass}`}
      >
        <Icon size={18} strokeWidth={2.25} className="shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 text-left leading-snug">{toast.message}</span>
      </p>
    </div>
  );
}

export function CampaignCreatorUxStatusToast() {
  const t = useTranslations("campaignCreator");
  const {
    mobileValidationToast,
    clearMobileValidationToast,
    saving,
    lastSavedAt,
    saveError
  } = useCampaignDraft();
  const [toast, setToast] = useState<StatusToast | null>(null);
  const toastKey = useRef(0);
  const wasSaving = useRef(false);

  function pushToast(variant: StatusToast["variant"], message: string) {
    toastKey.current += 1;
    setToast({ variant, message, key: toastKey.current });
  }

  useEffect(() => {
    if (!mobileValidationToast) return;
    pushToast(mobileValidationToast.variant, mobileValidationToast.message);
  }, [mobileValidationToast]);

  useEffect(() => {
    if (wasSaving.current && !saving && lastSavedAt && !saveError) {
      pushToast("success", formatSavedLabel(lastSavedAt, t));
    }
    wasSaving.current = saving;
  }, [saving, lastSavedAt, saveError, t]);

  useEffect(() => {
    if (!saveError) return;
    pushToast("error", t(saveError as Parameters<typeof t>[0]));
  }, [saveError, t]);

  useEffect(() => {
    if (!toast) return;
    const delayMs = toast.variant === "error" ? 5000 : 3500;
    const timer = window.setTimeout(() => {
      setToast(null);
      clearMobileValidationToast();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [toast, clearMobileValidationToast]);

  if (!toast) return null;

  return <StatusToastBanner key={toast.key} toast={toast} />;
}

/** @deprecated Use CampaignCreatorUxStatusToast */
export const CampaignCreatorUxMobileStatusToast = CampaignCreatorUxStatusToast;

function CampaignCreatorTitleBlock({
  title,
  subtitle,
  draftLabel
}: {
  title: string;
  subtitle: string;
  draftLabel: string;
}) {
  return (
    <PageTitleBlock
      className="flex-1"
      title={title}
      subtitle={subtitle}
      subtitleClassName="truncate"
      titleIcon={<Megaphone size={16} aria-hidden />}
      badge={
        <span
          className="rounded-full px-2.5 py-0.5 font-heading text-[11px] font-semibold lg:text-xs"
          style={{
            background: "var(--ui-accent-muted)",
            color: "var(--ui-accent)",
            border: "1px solid var(--ui-accent-border)"
          }}
        >
          {draftLabel}
        </span>
      }
    />
  );
}

export function CampaignCreatorUxHeader() {
  const t = useTranslations("campaignCreator");
  const { payload, addAdMode } = useCampaignDraft();
  const closeHref = useCloseHref();

  const title = addAdMode ? t("addAdTitle") : t("title");
  const subtitle = payload.campaign.name || t("newCampaign");

  return (
    <header className="campaign-creator-header shrink-0 px-4 pb-3 pt-3 lg:pl-8 lg:pr-4 lg:pb-4 lg:pt-4">
      <div className="flex items-start justify-between gap-3">
        <CampaignCreatorTitleBlock title={title} subtitle={subtitle} draftLabel={t("draftStatus")} />
        <Link
          href={closeHref}
          aria-label={t("close")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 lg:h-8 lg:w-8"
        >
          <X size={20} strokeWidth={2} style={{ color: "var(--text-dim)" }} />
        </Link>
      </div>
    </header>
  );
}

export function CampaignCreatorUxStepper() {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, setActiveNode, addAdMode } = useCampaignDraft();
  const campaignSubflow = useCampaignStepSubflowOptional();
  const visited = (n: CreatorNode) => payload.visitedNodes.includes(n);

  let steps: StepDef[];
  let current: number;

  if (addAdMode) {
    steps = [
      { number: 1, label: t("treeAd"), node: "ad" },
      { number: 2, label: t("treeReview"), node: "review" }
    ];
    current = activeNode === "review" ? 2 : 1;
  } else {
    steps = [
      { number: 1, label: t("objective"), node: null },
      { number: 2, label: t("treeCampaign"), node: "campaign" },
      { number: 3, label: t("treeAdset"), node: "adset" },
      { number: 4, label: t("treeAd"), node: "ad" },
      { number: 5, label: t("treeReview"), node: "review" }
    ];
    if (activeNode === "campaign" && campaignSubflow?.section === "objective") {
      current = 1;
    } else {
      const nodeIndex = NODE_ORDER.indexOf(activeNode);
      current = nodeIndex >= 0 ? nodeIndex + 2 : 2;
    }
  }

  const horizontalSteps = steps.map((s) => ({
    number: s.number,
    label: s.label,
    disabled:
      s.number === 1
        ? false
        : s.disabled ?? (s.node ? !visited(s.node) && activeNode !== s.node : s.number > 1)
  }));

  function onStepClick(stepNum: number) {
    const step = steps.find((s) => s.number === stepNum);
    if (stepNum === 1 && !addAdMode) {
      setActiveNode("campaign");
      campaignSubflow?.goTo("objective");
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
export function CampaignCreatorUxMobileProgress() {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, addAdMode } = useCampaignDraft();

  const stepPercent = computeWizardProgressPercent({
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

/** Navegação do criador — rodapé compacto, inline ou ao lado do stepper (desktop). */
export function CampaignCreatorUxNav({
  onPublish,
  publishing,
  placement = "footer"
}: {
  onPublish?: () => void;
  publishing?: boolean;
  placement?: "floating" | "footer" | "inline" | "stepper" | "sidebar";
}) {
  const t = useTranslations("campaignCreator");
  const tCommon = useTranslations("common");
  const { payload, activeNode, setActiveNode, addAdMode, showMobileValidationToast } =
    useCampaignDraft();
  const campaignSubflow = useCampaignStepSubflowOptional();
  const adsetSubflow = useAdSetStepSubflowOptional();
  const adSubflow = useAdStepSubflowOptional();

  const err = useStepValidationError();

  const { showBack, backEnabled } = resolveCreatorBackNav({
    addAdMode,
    activeNode,
    campaignIsFirst: activeNode === "campaign" ? campaignSubflow?.isFirst : false
  });

  function goNext() {
    if (err) {
      showMobileValidationToast("error", t(err as Parameters<typeof t>[0]));
      return;
    }
    if (activeNode === "campaign" && campaignSubflow && !campaignSubflow.isLast) {
      campaignSubflow.goNext();
      return;
    }
    if (activeNode === "adset" && adsetSubflow && !adsetSubflow.isLast) {
      adsetSubflow.goNext();
      return;
    }
    if (activeNode === "ad" && adSubflow && !adSubflow.isLast) {
      adSubflow.goNext();
      return;
    }
    const n = nextNode(activeNode);
    if (n) setActiveNode(n);
  }

  function goPrev() {
    if (!addAdMode && activeNode === "campaign" && campaignSubflow?.goPrev()) return;
    if (activeNode === "adset" && adsetSubflow?.goPrev()) return;
    if (activeNode === "ad" && adSubflow?.goPrev()) return;
    const p = prevNode(activeNode);
    if (p) setActiveNode(p);
  }

  const wrapperClass =
    placement === "floating"
      ? "ui-wizard-nav--floating"
      : placement === "footer"
        ? "ui-wizard-nav--footer"
        : placement === "stepper"
          ? "ui-wizard-nav--stepper"
          : placement === "sidebar"
            ? "ui-wizard-nav--sidebar"
            : "mt-6 space-y-3";

  const footerNav = placement === "footer";
  const stepperNav = placement === "stepper";
  const sidebarNav = placement === "sidebar";
  const progress = computeWizardStepNumber({
    addAdMode,
    activeNode,
    campaignSection: activeNode === "campaign" ? campaignSubflow?.section : undefined
  });

  return (
    <div className={wrapperClass}>
      <div
        className={
          placement === "floating" ||
          placement === "footer" ||
          placement === "stepper" ||
          placement === "sidebar"
            ? "ui-wizard-nav__actions"
            : `flex items-center gap-2 ${showBack ? "justify-between" : "justify-end"}`
        }
      >
        {footerNav || stepperNav || sidebarNav || showBack ? (
          <button
            type="button"
            disabled={!backEnabled}
            onClick={backEnabled ? goPrev : undefined}
            aria-disabled={!backEnabled}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
            {t("back")}
          </button>
        ) : (
          <span className="ui-wizard-nav__btn-spacer" aria-hidden />
        )}
        {footerNav || sidebarNav ? (
          <span
            className="ui-wizard-nav__progress shrink-0 text-xs font-semibold text-[var(--text-dim)]"
            aria-label={`Etapa ${progress.current} de ${progress.total}`}
          >
            {progress.current}/{progress.total}
          </span>
        ) : null}
        {activeNode !== "review" ? (
          <button
            type="button"
            onClick={goNext}
            className={`ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1 px-4 text-sm font-heading font-semibold${footerNav || stepperNav || sidebarNav ? "" : " ml-auto"}`}
          >
            {t("next")}
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            disabled={publishing}
            onClick={onPublish}
            className={`ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50${footerNav || stepperNav || sidebarNav ? "" : " ml-auto"}`}
          >
            {publishing ? tCommon("sending") : addAdMode ? t("publishAd") : t("publish")}
          </button>
        )}
      </div>
    </div>
  );
}

/** Linha do stepper — navegação desktop fica no rodapé fixo da sidebar. */
export function CampaignCreatorUxStepperRow() {
  return (
    <div className="campaign-creator-stepper-row col-start-1 row-start-1 hidden shrink-0 items-center gap-3 border-b border-[var(--border-color)] py-2 lg:flex lg:gap-4 lg:py-1.5">
      <div className="min-w-0 flex-1 overflow-x-auto">
        <CampaignCreatorUxStepper />
      </div>
    </div>
  );
}
