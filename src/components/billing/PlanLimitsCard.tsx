"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  planListCents,
  resolveBillingCurrency,
  resolvePlanMonthlyCents
} from "@/lib/billing/currency";
import type { ExternalPrices, PlanLimits, TenantUsage } from "@/lib/billing/types";
import {
  calculateCheckoutPricing,
  formatMoney,
  MONTHLY_PIX_DISCOUNT_PERCENT,
  YEARLY_DISCOUNT_PERCENT,
  YEARLY_PIX_DISCOUNT_PERCENT,
  type PricingBreakdown
} from "@/lib/billing/pricing";

export function BillingBackLink({ href = "/billing/plans", label }: { href?: string; label?: string }) {
  const t = useTranslations("billingPage");
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2.5 text-sm font-medium text-[var(--text-dim)] transition hover:text-[var(--violet)]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-color)] bg-white shadow-sm transition group-hover:border-[var(--amber)]/40 group-hover:bg-[rgba(124,58,237,0.06)] group-hover:text-[var(--violet)]">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </span>
      {label ?? t("back")}
    </Link>
  );
}

function DiscountBadge({
  type,
  percent,
  label,
  dark = false,
  highlight = false
}: {
  type: "annual" | "pix";
  percent: number;
  label: string;
  dark?: boolean;
  highlight?: boolean;
}) {
  const isPix = type === "pix";

  const base = highlight
    ? isPix
      ? dark
        ? "bg-gradient-to-r from-teal-500/30 to-emerald-500/30 ring-1 ring-teal-400/50"
        : "bg-gradient-to-r from-teal-500 to-emerald-500 shadow-sm shadow-teal-200/50"
      : dark
        ? "bg-emerald-500/20 ring-1 ring-emerald-400/40"
        : "bg-gradient-to-r from-emerald-500 to-green-500 shadow-sm shadow-emerald-200/50"
    : dark
      ? "bg-white/10 ring-1 ring-white/15"
      : isPix
        ? "bg-teal-50 ring-1 ring-teal-100"
        : "bg-emerald-50 ring-1 ring-emerald-100";

  const text = highlight
    ? "text-white"
    : dark
      ? isPix
        ? "text-teal-200"
        : "text-emerald-200"
      : isPix
        ? "text-teal-800"
        : "text-emerald-800";

  const pctBg = highlight
    ? "bg-white/25 text-white"
    : dark
      ? "bg-white/15 text-white"
      : isPix
        ? "bg-teal-600 text-white"
        : "bg-emerald-600 text-white";

  return (
    <span
      className={`inline-flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${base} ${text}`}
    >
      <span className="flex items-center gap-2 leading-none">
        {isPix ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-black tracking-widest ${
              highlight ? "bg-white/20 text-white" : dark ? "bg-teal-500/30 text-teal-100" : "bg-teal-600 text-white"
            }`}
          >
            PIX
          </span>
        ) : (
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${
              highlight ? "bg-white/20" : dark ? "bg-emerald-500/30" : "bg-emerald-600 text-white"
            }`}
          >
            %
          </span>
        )}
        {label}
      </span>
      <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black leading-none ${pctBg}`}>
        -{percent}%
      </span>
    </span>
  );
}

function PlanDiscountBadges({
  cycle,
  isFree,
  dark = false
}: {
  cycle: "monthly" | "yearly";
  isFree: boolean;
  dark?: boolean;
}) {
  const t = useTranslations("billingPage");
  if (isFree) return null;

  if (cycle === "yearly") {
    return (
      <div className="mt-3 flex flex-col gap-1.5">
        <DiscountBadge
          type="pix"
          percent={YEARLY_PIX_DISCOUNT_PERCENT}
          label={t("discountPixLabel")}
          dark={dark}
          highlight
        />
        <DiscountBadge
          type="annual"
          percent={YEARLY_DISCOUNT_PERCENT}
          label={t("discountAnnualLabel")}
          dark={dark}
        />
      </div>
    );
  }

  return (
    <div className="mt-3">
      <DiscountBadge
        type="pix"
        percent={MONTHLY_PIX_DISCOUNT_PERCENT}
        label={t("discountPixLabel")}
        dark={dark}
        highlight
      />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function PlanLimitsCard({
  limits,
  usage,
  compact = false,
  variant = "portal"
}: {
  limits: PlanLimits;
  usage?: TenantUsage;
  compact?: boolean;
  variant?: "portal" | "marketing";
}) {
  const t = useTranslations("billingPage");
  const isMarketing = variant === "marketing";

  const rows: Array<{ key: keyof PlanLimits; label: string; usageVal?: number }> = [
    { key: "maxClients", label: t("limitClients"), usageVal: usage?.clients },
    { key: "maxAdAccounts", label: t("limitAdAccounts"), usageVal: usage?.adAccounts },
    { key: "maxMembers", label: t("limitMembers"), usageVal: usage?.members },
    { key: "maxAutomationRules", label: t("limitAutomations"), usageVal: usage?.automationRules },
    { key: "maxAiRequestsPerMonth", label: t("limitAi"), usageVal: usage?.aiRequestsThisMonth },
    { key: "maxScheduledReports", label: t("limitReports"), usageVal: usage?.scheduledReports }
  ];

  return (
    <ul className={`space-y-2.5 ${compact ? "text-sm" : ""}`}>
      {rows.map(({ key, label, usageVal }) => {
        const max = limits[key] as number;
        return (
          <li key={key} className="flex items-start justify-between gap-3">
            <span
              className={`flex items-center gap-2 ${isMarketing ? "text-violet-200/80" : "text-[var(--text-dim)]"}`}
            >
              <CheckIcon />
              {label}
            </span>
            <span
              className={`shrink-0 font-semibold ${isMarketing ? "text-white" : "text-[var(--text-main)]"}`}
            >
              {usageVal != null ? `${usageVal}/${max}` : max}
            </span>
          </li>
        );
      })}
      <li className="flex items-center justify-between gap-3">
        <span
          className={`flex items-center gap-2 ${isMarketing ? "text-violet-200/80" : "text-[var(--text-dim)]"}`}
        >
          {limits.allowAutoSync ? <CheckIcon /> : <CrossIcon />}
          {t("limitAutoSync")}
        </span>
        <span className={`text-xs font-medium ${isMarketing ? "text-violet-300/70" : "text-[var(--text-dim)]"}`}>
          {limits.allowAutoSync ? t("included") : "—"}
        </span>
      </li>
      <li className="flex items-center justify-between gap-3">
        <span
          className={`flex items-center gap-2 ${isMarketing ? "text-violet-200/80" : "text-[var(--text-dim)]"}`}
        >
          {limits.allowLiveMeta ? <CheckIcon /> : <CrossIcon />}
          {t("limitLiveMeta")}
        </span>
        <span className={`text-xs font-medium ${isMarketing ? "text-violet-300/70" : "text-[var(--text-dim)]"}`}>
          {limits.allowLiveMeta ? t("included") : "—"}
        </span>
      </li>
    </ul>
  );
}

export function PlanPrice({
  plan,
  cycle,
  trialDays = 0,
  variant = "portal"
}: {
  plan: {
    priceMonthlyCents: number;
    priceYearlyCents: number;
    externalPrices?: ExternalPrices | null;
  };
  cycle: "monthly" | "yearly";
  trialDays?: number;
  variant?: "portal" | "marketing";
}) {
  const t = useTranslations("billingPage");
  const locale = useLocale();
  const currency = resolveBillingCurrency(locale);
  const isMarketing = variant === "marketing";
  const textMain = isMarketing ? "text-white" : "text-[var(--text-main)]";
  const textDim = isMarketing ? "text-violet-200/70" : "text-[var(--text-dim)]";
  const textDimmer = isMarketing ? "text-violet-300/50" : "text-[var(--text-dimmer)]";

  if (trialDays > 0) {
    return (
      <div>
        <span className={`text-3xl font-bold tracking-tight ${textMain}`}>
          {t("freeTrialDays", { days: trialDays })}
        </span>
        <p className={`mt-1 text-sm ${textDim}`}>{t("freeTrialHint")}</p>
      </div>
    );
  }

  const monthlyCents = resolvePlanMonthlyCents(plan, currency);
  const pricing = calculateCheckoutPricing({
    priceMonthlyCents: monthlyCents,
    listCents: planListCents(plan, cycle, currency),
    cycle,
    provider: "asaas",
    billingType: "CREDIT_CARD"
  });
  const period = cycle === "yearly" ? t("perYear") : t("perMonth");

  return (
    <div>
      {pricing.discountPercent > 0 ? (
        <p className={`text-sm line-through ${textDimmer}`}>{formatMoney(pricing.listCents, currency)}</p>
      ) : null}
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`text-4xl font-bold tracking-tight ${textMain}`}>
          {formatMoney(pricing.finalCents, currency)}
        </span>
        <span className={`text-sm font-medium ${textDim}`}>{period}</span>
      </div>
    </div>
  );
}

export function BillingCtaLink({
  planId,
  slug,
  className,
  featured = false,
  variant = "portal"
}: {
  planId: string;
  slug: string;
  className?: string;
  featured?: boolean;
  variant?: "portal" | "marketing";
}) {
  const t = useTranslations("billingPage");

  if (variant === "marketing") {
    const callbackUrl = slug === "free" ? "/dashboard" : `/billing/checkout?plan=${planId}`;
    const href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return (
      <Link
        href={href}
        className={
          className ??
          `mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
            featured
              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#0f1419] shadow-lg shadow-amber-500/25 hover:brightness-105"
              : "border border-white/20 bg-white/10 text-white hover:bg-white/15"
          }`
        }
      >
        {slug === "free" ? t("startFreeTrial") : t("subscribe")}
      </Link>
    );
  }

  if (slug === "free") {
    return (
      <Link
        href="/billing"
        className={className ?? "mt-6 block w-full rounded-xl border border-[var(--border-color)] py-3 text-center text-sm font-semibold text-[var(--text-dim)] transition hover:bg-[var(--surface-thead)]"}
      >
        {t("startFreeTrial")}
      </Link>
    );
  }
  return (
    <Link
      href={`/billing/checkout?plan=${planId}`}
      className={
        className ??
        `mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
          featured
            ? "bg-[var(--amber)] text-[#0f1419] shadow-lg shadow-amber-600/25 hover:brightness-105"
            : "border border-amber-200 bg-amber-50 text-[var(--amber)] hover:bg-amber-100"
        }`
      }
    >
      {t("subscribe")}
    </Link>
  );
}

export type PlanCardData = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  trialDays?: number;
  currency?: string;
  externalPrices?: ExternalPrices | null;
  limits: PlanLimits;
};

type PlanTier = "free" | "standard" | "popular" | "premium";

function planTier(slug: string): PlanTier {
  if (slug === "free") return "free";
  if (slug === "agency") return "premium";
  if (slug === "advanced") return "popular";
  return "standard";
}

const TIER_STYLES: Record<PlanTier, string> = {
  free: "border-[var(--border-color)]/80 bg-white shadow-sm hover:border-slate-300 hover:shadow-md",
  standard: "border-[var(--border-color)]/80 bg-white shadow-sm hover:border-[var(--amber)]/40 hover:shadow-md",
  popular:
    "border-violet-300 bg-gradient-to-b from-violet-50 to-white shadow-lg shadow-violet-100/60 ring-1 ring-violet-200 lg:scale-[1.02]",
  premium:
    "border-slate-800/20 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl shadow-slate-900/30 ring-1 ring-amber-400/40 lg:scale-[1.05] lg:-mt-2 lg:mb-2"
};

const MARKETING_TIER_STYLES: Record<PlanTier, string> = {
  free: "border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/95 text-white shadow-lg backdrop-blur-sm hover:border-white/20",
  standard:
    "border-white/15 bg-gradient-to-b from-slate-900/90 to-indigo-950/90 text-white shadow-lg backdrop-blur-sm hover:border-amber-400/30",
  popular:
    "border-violet-400/45 bg-gradient-to-b from-violet-950/95 via-indigo-950/90 to-slate-950/95 text-white shadow-xl shadow-violet-900/30 ring-1 ring-violet-400/35 lg:scale-[1.03] lg:-mt-1",
  premium:
    "border-amber-400/50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl shadow-amber-900/20 ring-1 ring-amber-400/40 lg:scale-[1.05] lg:-mt-2 lg:mb-2"
};

export function PlanCard({
  plan,
  cycle,
  featured = false,
  variant = "portal"
}: {
  plan: PlanCardData;
  cycle: "monthly" | "yearly";
  featured?: boolean;
  variant?: "portal" | "marketing";
}) {
  const t = useTranslations("billingPage");
  const tier = planTier(plan.slug);
  const isPremium = tier === "premium";
  const isPopular = tier === "popular" || featured;
  const isFree = tier === "free";
  const isMarketing = variant === "marketing";
  const cardStyle = isMarketing ? MARKETING_TIER_STYLES[tier] : TIER_STYLES[tier];
  const titleClass = isMarketing || isPremium ? "text-white" : "text-[var(--text-main)]";
  const descClass =
    isMarketing || isPremium ? "text-violet-200/75" : "text-[var(--text-dim)]";
  const dividerClass = isMarketing || isPremium ? "border-white/10" : "border-[var(--border-color)]";

  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 transition ${cardStyle}`}>
      {isPopular && !isPremium ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--amber)] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#0f1419] shadow-md">
          {t("mostPopular")}
        </span>
      ) : null}
      {isPremium ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-0.5 text-[11px] font-black uppercase tracking-wide text-[var(--text-main)] shadow-md">
          {t("planPremium")}
        </span>
      ) : null}

      <div className="mb-4">
        <h2 className={`text-lg font-bold ${titleClass}`}>{plan.name}</h2>
        {plan.description ? (
          <p className={`mt-1 text-sm leading-relaxed ${descClass}`}>{plan.description}</p>
        ) : null}
      </div>

      <div>
        <PlanPrice plan={plan} cycle={cycle} trialDays={plan.trialDays} variant={variant} />
        <PlanDiscountBadges cycle={cycle} isFree={isFree} dark={isMarketing || isPremium} />
      </div>

      <div className={`my-6 border-t pt-5 ${dividerClass}`}>
        <PlanLimitsCard limits={plan.limits} compact variant={variant} />
      </div>

      <div className="mt-auto">
        <BillingCtaLink
          planId={plan.id}
          slug={plan.slug}
          featured={isPopular || isPremium}
          variant={variant}
          className={
            isPremium
              ? "mt-6 block w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3.5 text-center text-sm font-extrabold text-[var(--text-main)] shadow-lg transition hover:from-amber-300 hover:to-amber-400"
              : undefined
          }
        />
      </div>
    </div>
  );
}

export function CheckoutPlanSummary({
  plan,
  cycle,
  pricing,
  currency: currencyOverride
}: {
  plan: PlanCardData;
  cycle: "monthly" | "yearly";
  pricing: PricingBreakdown;
  currency?: string;
}) {
  const locale = useLocale();
  const currency = currencyOverride ?? resolveBillingCurrency(locale);
  const t = useTranslations("billingPage");

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(124,58,237,0.15)] bg-gradient-to-br from-violet-50 via-white to-slate-50 shadow-sm">
      <div className="border-b border-amber-100/80 bg-[var(--amber)]/5 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--violet)]">{t("yourPlan")}</p>
        <h2 className="mt-1 text-xl font-bold text-[var(--text-main)]">{plan.name}</h2>

        {pricing.discountPercent > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-dim)]">
            <span className="line-through">{formatMoney(pricing.listCents, currency)}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              {t("discountBadge", { percent: pricing.discountPercent })}
            </span>
          </div>
        ) : null}

        <p className="mt-1 text-2xl font-bold text-[var(--text-main)]">
          {formatMoney(pricing.finalCents, currency)}
          <span className="ml-1 text-sm font-normal text-[var(--text-dim)]">
            / {cycle === "yearly" ? t("perYear") : t("perMonth")}
          </span>
        </p>

        {pricing.installmentCount >= 2 && pricing.installmentValueCents ? (
          <p className="mt-1 text-sm text-violet-700">
            {t("installmentSummary", {
              count: pricing.installmentCount,
              value: formatMoney(pricing.installmentValueCents, currency)
            })}
          </p>
        ) : null}
      </div>
      <div className="px-5 py-4">
        <PlanLimitsCard limits={plan.limits} compact />
      </div>
    </div>
  );
}

export function DiscountRulesBanner() {
  const t = useTranslations("billingPage");
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
      <p className="font-semibold">{t("discountRulesTitle")}</p>
      <ul className="mt-2 space-y-1 text-emerald-800/90">
        <li>{t("discountRuleYearly", { percent: YEARLY_DISCOUNT_PERCENT })}</li>
        <li>{t("discountRuleYearlyPix", { percent: YEARLY_PIX_DISCOUNT_PERCENT })}</li>
        <li>{t("discountRuleYearlyInstallments", { percent: YEARLY_DISCOUNT_PERCENT })}</li>
        <li>{t("discountRuleMonthlyPix", { percent: MONTHLY_PIX_DISCOUNT_PERCENT })}</li>
      </ul>
    </div>
  );
}
