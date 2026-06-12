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

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50 shadow-sm">
      <div className="border-b border-violet-100/80 bg-violet-600/5 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{t("currentPlan")}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{plan?.name ?? "Free"}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SubscriptionStatusBadge status={displayStatus} />
          {showDemoCountdown ? (
            <span className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-bold text-white">
              {t("trialDaysLeft", { days: daysLeft })}
            </span>
          ) : null}
          {isPaid ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {cycleLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {showDemoCountdown ? (
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-violet-900">{t("demoProgress")}</span>
              <span className="font-bold text-violet-700">
                {t("trialDaysLeft", { days: daysLeft })}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all"
                style={{ width: `${Math.max(8, trialPct)}%` }}
              />
            </div>
            {currentPeriodEnd ? (
              <p className="mt-2 text-xs text-violet-700">
                {t("trialEnds")}{" "}
                <span className="font-semibold">
                  {new Date(currentPeriodEnd).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {isPaid && currentPeriodEnd ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {t("nextRenewal")}
              </p>
              <p className="text-lg font-bold text-slate-900">
                {new Date(currentPeriodEnd).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </p>
              <p className="text-xs text-emerald-800">{t("renewalHint", { cycle: cycleLabel })}</p>
            </div>
          </div>
        ) : null}

        {!showDemoCountdown && !isPaid && currentPeriodEnd ? (
          <p className="text-sm text-slate-600">
            {t("trialEnds")}{" "}
            <span className="font-semibold text-slate-900">
              {new Date(currentPeriodEnd).toLocaleDateString()}
            </span>
          </p>
        ) : null}

        {isPaid && canManageBilling && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 underline hover:text-slate-600"
          >
            {cancelAtPeriodEnd ? t("cancelPending") : t("cancelSubscription")}
          </button>
        ) : null}
        {isPaid && !canManageBilling ? (
          <p className="text-xs text-slate-400">{t("cancelContactAdmin")}</p>
        ) : null}
      </div>
    </div>
  );
}
