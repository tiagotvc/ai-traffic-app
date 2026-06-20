"use client";

import { useLocale, useTranslations } from "next-intl";
import { isBrBillingMode } from "@/lib/billing/currency";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BillingPlansSkeleton } from "@/components/billing/BillingSkeletons";
import { BillingBackLink, PlanCard, type PlanCardData } from "@/components/billing/PlanLimitsCard";

export function BillingPlansClient() {
  const t = useTranslations("billingPage");
  const locale = useLocale();
  const isBr = isBrBillingMode(locale);
  const [plans, setPlans] = useState<PlanCardData[]>([]);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((j) => setPlans(j.plans ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <BillingPlansSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-4">
      <BillingBackLink href="/billing" />

      <div className="text-center">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[var(--text-main)]">{t("plansTitle")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-dim)]">{t("plansSubtitle")}</p>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex rounded-2xl border border-[var(--border-color)] bg-slate-100/80 p-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-xl px-6 py-2.5 text-sm font-bold transition ${
              cycle === "monthly"
                ? "bg-white text-[var(--text-main)] shadow-sm"
                : "text-[var(--text-dim)] hover:text-[var(--text-dim)]"
            }`}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`rounded-xl px-6 py-2.5 text-sm font-bold transition ${
              cycle === "yearly"
                ? "bg-white text-[var(--text-main)] shadow-sm"
                : "text-[var(--text-dim)] hover:text-[var(--text-dim)]"
            }`}
          >
            {t("yearly")}
            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
              -10%
            </span>
          </button>
        </div>
      </div>

      <div className="grid items-end gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} cycle={cycle} featured={p.slug === "advanced"} />
        ))}
      </div>

      <p className="text-center text-xs text-[var(--text-dimmer)]">
        {isBr ? t("plansFootnoteBr") : t("plansFootnote")}{" "}
        <Link href="/billing" className="ui-link">
          {t("backToPortal")}
        </Link>
      </p>
    </div>
  );
}
