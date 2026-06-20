"use client";

import { useTranslations } from "next-intl";
import { SubscriptionStatusBadge } from "@/components/billing/billing-ui";
import { daysUntil } from "@/components/billing/billing-ui";

type PlanInfo = {
  slug: string;
  name: string;
  trialDays?: number;
};

export function BillingPlanCard({
  plan,
  status,
  billingCycle,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  onCancel,
  canManageBilling
}: {
  plan: PlanInfo | null;
  status: string;
  billingCycle?: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  onCancel?: () => void;
  canManageBilling?: boolean;
}) {
  const t = useTranslations("billingPage");
  const slug = plan?.slug ?? "free";
  const isFree = slug === "free";
  const daysLeft = daysUntil(currentPeriodEnd);
  const showDemoCountdown = isFree && daysLeft != null && daysLeft > 0;
  const trialTotal = plan?.trialDays ?? 7;
  const trialElapsed =
    showDemoCountdown && currentPeriodStart && currentPeriodEnd
      ? Math.max(0, trialTotal - daysLeft)
      : 0;
  const trialPct = showDemoCountdown ? Math.min(100, Math.round((trialElapsed / trialTotal) * 100)) : 0;

  const isPaid = !isFree && status === "active";
  const cycleLabel = billingCycle === "yearly" ? t("yearly") : t("monthly");
  const displayStatus = showDemoCountdown ? "trialing" : status;

  const renewalDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : null;

  return (
    <div className="ui-card overflow-hidden">
      <div className="border-b border-[rgba(124,58,237,0.15)] bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">
          {t("currentPlan")}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xl font-bold tracking-tight">{plan?.name ?? "Free"}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <SubscriptionStatusBadge status={displayStatus} />
            {isPaid ? (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
                {cycleLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {showDemoCountdown ? (
          <div className="rounded-lg border border-[rgba(124,58,237,0.15)] bg-[rgba(124,58,237,0.06)]/70 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--violet)]">{t("demoProgress")}</span>
              <span className="font-bold text-violet-700">{t("trialDaysLeft", { days: daysLeft })}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(124,58,237,0.1)]">
              <div
                className="h-full rounded-full bg-[rgba(124,58,237,0.06)]0 transition-all"
                style={{ width: `${Math.max(8, trialPct)}%` }}
              />
            </div>
            {renewalDate ? (
              <p className="mt-1.5 text-[11px] text-violet-700">
                {t("trialEnds")} <span className="font-semibold">{renewalDate}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {isPaid && renewalDate ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                {t("nextRenewal")}
              </p>
              <p className="text-sm font-bold text-[var(--text-main)]">{renewalDate}</p>
              <p className="text-[11px] text-emerald-800">{t("renewalHint", { cycle: cycleLabel })}</p>
            </div>
          </div>
        ) : null}

        {!showDemoCountdown && !isPaid && renewalDate ? (
          <p className="text-xs text-[var(--text-dim)]">
            {t("trialEnds")} <span className="font-semibold text-[var(--text-main)]">{renewalDate}</span>
          </p>
        ) : null}

        {isPaid && canManageBilling && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-medium text-[var(--text-dimmer)] transition hover:text-[var(--text-dim)]"
          >
            {cancelAtPeriodEnd ? t("cancelPending") : t("cancelSubscription")}
          </button>
        ) : null}
        {isPaid && !canManageBilling ? (
          <p className="text-[11px] text-[var(--text-dimmer)]">{t("cancelContactAdmin")}</p>
        ) : null}
      </div>
    </div>
  );
}
