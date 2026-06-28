"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PlanCardData } from "@/components/billing/PlanLimitsCard";
import { planListCents, resolvePlanMonthlyCents } from "@/lib/billing/currency";
import { calculateCheckoutPricing, formatMoney } from "@/lib/billing/pricing";

type TierStyle = {
  card: string;
  active: string;
  badge: string;
  accent: string;
  muted: string;
  title: string;
};

const TIER_STYLES: Record<string, TierStyle> = {
  basic: {
    card: "border-[var(--border-color)] bg-[var(--surface-card)] hover:border-[var(--ui-accent-border)] hover:shadow-md",
    active: "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] shadow-md ring-2 ring-[var(--ui-accent-ring)]",
    badge: "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)]",
    accent: "text-[var(--ui-accent)]",
    muted: "text-[var(--text-dim)]",
    title: "text-[var(--text-main)]"
  },
  advanced: {
    card: "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] hover:border-[var(--ui-accent-border-strong)] hover:shadow-md",
    active: "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] shadow-lg ring-2 ring-[var(--ui-accent-ring)]",
    badge: "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)]",
    accent: "text-[var(--ui-accent)]",
    muted: "text-[var(--text-dim)]",
    title: "text-[var(--text-main)]"
  },
  agency: {
    card: "border-slate-600 bg-gradient-to-b from-slate-800 to-slate-900 hover:border-[var(--ui-accent-border)] hover:shadow-lg",
    active: "border-[var(--ui-accent)] bg-gradient-to-b from-slate-900 to-slate-800 shadow-lg ring-2 ring-[var(--ui-accent-ring)]",
    badge: "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)]",
    accent: "text-[var(--ui-accent)]",
    muted: "text-[var(--text-dimmer)]",
    title: "text-white"
  }
};

function tierStyle(slug: string): TierStyle {
  return TIER_STYLES[slug] ?? TIER_STYLES.basic;
}

function periodLabel(cycle: "monthly" | "yearly", t: (key: string) => string) {
  const raw = cycle === "yearly" ? t("perYear") : t("perMonth");
  return raw.replace(/^\s*\/\s*/, "").trim();
}

export function CheckoutPlanSwitcher({
  plans,
  selectedPlanId,
  cycle,
  billingType,
  currency,
  onSelect,
  loading
}: {
  plans: PlanCardData[];
  selectedPlanId: string;
  cycle: "monthly" | "yearly";
  billingType: "PIX" | "CREDIT_CARD";
  currency: string;
  onSelect: (planId: string) => void;
  loading?: boolean;
}) {
  const t = useTranslations("billingPage");
  const paidPlans = plans.filter((p) => p.slug !== "free");
  const period = periodLabel(cycle, t);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="checkout-plan-switcher-header text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
          {t("checkoutChangePlan")}
        </p>
        <Link
          href="/billing/plans"
          className="checkout-plan-switcher-link text-xs ui-link"
        >
          {t("checkoutComparePlans")}
        </Link>
      </div>
      <div className="grid gap-3 pt-2 sm:grid-cols-3 sm:gap-2">
        {paidPlans.map((p) => {
          const pricing = calculateCheckoutPricing({
            priceMonthlyCents: resolvePlanMonthlyCents(p, "BRL"),
            listCents: planListCents(p, cycle, "BRL"),
            cycle,
            provider: "asaas",
            billingType
          });
          const active = p.id === selectedPlanId;
          const styles = tierStyle(p.slug);
          const badgeLabel =
            p.slug === "advanced" ? t("mostPopular") : p.slug === "agency" ? t("planPremium") : null;

          return (
            <div key={p.id} className="relative">
              {badgeLabel ? (
                <span
                  className={`pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm ${styles.badge}`}
                >
                  {badgeLabel}
                </span>
              ) : null}
              <button
                type="button"
                disabled={loading}
                onClick={() => onSelect(p.id)}
                className={`flex h-full w-full flex-col rounded-[var(--btn-radius)] border-2 px-3 py-4 text-left transition-all ${
                  badgeLabel ? "pt-5" : "pt-4"
                } ${active ? styles.active : styles.card} ${
                  active ? "scale-[1.02]" : "scale-[0.98] opacity-90 hover:scale-100 hover:opacity-100"
                } ${loading ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className={`text-sm font-bold leading-tight ${styles.title}`}>{p.name}</span>
                <span className={`mt-2 text-base font-extrabold leading-none ${styles.accent}`}>
                  {formatMoney(pricing.finalCents, currency)}
                  <span className={`ml-0.5 text-[11px] font-medium ${styles.muted}`}>/{period}</span>
                </span>
                {p.description ? (
                  <span className={`mt-2 line-clamp-2 text-[11px] leading-snug ${styles.muted}`}>
                    {p.description}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
