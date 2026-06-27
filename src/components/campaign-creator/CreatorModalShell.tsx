"use client";

import { useEffect, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAiCreditCost } from "@/hooks/useAiCreditCost";
import type { AiCreditKind } from "@/lib/ai-credits/types";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Link } from "@/i18n/navigation";
import { DsButton } from "@/design-system";
import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";
import { UxWizardModalPanel } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

export type CreatorModalWidth = "md" | "lg" | "xl";

const widthClass: Record<CreatorModalWidth, "md" | "lg" | "xl"> = {
  md: "md",
  lg: "lg",
  xl: "xl"
};

export type CreatorModalFooterProps = {
  onClear?: () => void;
  clearDisabled?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
  onPrimary?: () => void;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  showPrimaryCheck?: boolean;
  primaryForm?: string;
};

type CreatorModalShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  titleIcon?: ReactNode;
  showAiBadge?: boolean;
  width?: CreatorModalWidth;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  hideFooter?: boolean;
} & CreatorModalFooterProps;

function CreatorModalFooter({
  onClear,
  clearDisabled,
  onCancel,
  cancelLabel,
  onPrimary,
  primaryLabel,
  primaryDisabled,
  primaryLoading,
  showPrimaryCheck = true,
  primaryForm
}: CreatorModalFooterProps) {
  const t = useTranslations("campaignCreator");
  const hasActions = onClear || onCancel || onPrimary;

  if (!hasActions) return null;

  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] px-5 py-3">
      <div className="min-w-0">
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            disabled={clearDisabled}
            className="text-xs font-medium text-[var(--text-dim)] transition hover:text-[var(--text-main)] disabled:opacity-50"
          >
            {t("modalClearFields")}
          </button>
        ) : (
          <span aria-hidden />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel ? (
          <DsButton variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel ?? t("modalCancel")}
          </DsButton>
        ) : null}
        {onPrimary ? (
          <DsButton
            variant="accent"
            size="sm"
            onClick={onPrimary}
            disabled={primaryDisabled || primaryLoading}
            form={primaryForm}
            type={primaryForm ? "submit" : "button"}
            className="inline-flex items-center gap-1.5"
          >
            {showPrimaryCheck ? <Check size={14} strokeWidth={2.5} aria-hidden /> : null}
            {primaryLoading ? t("saving") : (primaryLabel ?? t("modalSave"))}
          </DsButton>
        ) : null}
      </div>
    </footer>
  );
}

export function CreatorModalHeader({
  title,
  subtitle,
  titleIcon,
  showAiBadge,
  onClose,
  closeDisabled
}: {
  title: string;
  subtitle?: string;
  titleIcon?: ReactNode;
  showAiBadge?: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  const t = useTranslations("campaignCreator");

  return (
    <header className="shrink-0 border-b border-[var(--border-color)] px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {titleIcon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
              {titleIcon}
            </span>
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{title}</h2>
              {showAiBadge ? (
                <span className="rounded-md border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] px-1.5 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-accent)]">
                  {t("modalAiBadge")}
                </span>
              ) : null}
            </div>
            {subtitle ? <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">{subtitle}</p> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label={t("close")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-dimmer)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-main)] disabled:opacity-50"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
}

/** Shell canônico para modais do criador de campanhas (header + corpo + footer). */
export function CreatorModalShell({
  open,
  onClose,
  title,
  subtitle,
  titleIcon,
  showAiBadge,
  width = "lg",
  className,
  contentClassName,
  children,
  footer,
  hideFooter,
  onClear,
  clearDisabled,
  onCancel,
  cancelLabel,
  onPrimary,
  primaryLabel,
  primaryDisabled,
  primaryLoading,
  showPrimaryCheck,
  primaryForm
}: CreatorModalShellProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const defaultFooter = hideFooter ? null : (
    <CreatorModalFooter
      onClear={onClear}
      clearDisabled={clearDisabled}
      onCancel={onCancel ?? onClose}
      cancelLabel={cancelLabel}
      onPrimary={onPrimary}
      primaryLabel={primaryLabel}
      primaryDisabled={primaryDisabled}
      primaryLoading={primaryLoading}
      showPrimaryCheck={showPrimaryCheck}
      primaryForm={primaryForm}
    />
  );

  return (
    <UxModalPortal open={open} onClose={onClose}>
      <UxWizardModalPanel size={widthClass[width]} className={cn("max-h-[min(920px,92vh)]", className)}>
        <CreatorModalHeader
          title={title}
          subtitle={subtitle}
          titleIcon={titleIcon}
          showAiBadge={showAiBadge}
          onClose={onClose}
        />
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", contentClassName)}>{children}</div>
        {footer !== undefined ? footer : defaultFooter}
      </UxWizardModalPanel>
    </UxModalPortal>
  );
}

type CreatorAiModalShellProps = Omit<CreatorModalShellProps, "showAiBadge"> & {
  aiCredits?: { kind: AiCreditKind; calls?: number };
  creditsLearnMoreHref?: string;
};

/** Shell para modais com IA — inclui faixa de créditos abaixo do header. */
export function CreatorAiModalShell({
  aiCredits,
  creditsLearnMoreHref = "/settings?tab=general",
  children,
  ...props
}: CreatorAiModalShellProps) {
  return (
    <CreatorModalShell {...props} showAiBadge>
      {aiCredits ? (
        <CreatorAiCreditsBar kind={aiCredits.kind} calls={aiCredits.calls} learnMoreHref={creditsLearnMoreHref} />
      ) : null}
      {children}
    </CreatorModalShell>
  );
}

export function CreatorAiCreditsBar({
  kind,
  calls = 1,
  learnMoreHref
}: {
  kind: AiCreditKind;
  calls?: number;
  learnMoreHref?: string;
}) {
  const t = useTranslations("campaignCreator");
  const unitCost = useAiCreditCost(kind);
  const total = Math.max(1, unitCost * calls);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]/40 px-3 py-2">
      <p className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
        <Sparkles size={12} className="shrink-0 text-[var(--ui-accent)]" aria-hidden />
        {t("aiCreditsWillBeUsed", { cost: total })}
      </p>
      {learnMoreHref ? (
        <Link href={learnMoreHref} className="ui-link shrink-0 text-[11px] font-medium">
          {t("ctaLearnMore")}
        </Link>
      ) : null}
    </div>
  );
}
