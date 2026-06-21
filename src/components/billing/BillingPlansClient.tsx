"use client";

import { useLocale, useTranslations } from "next-intl";
import { isBrBillingMode } from "@/lib/billing/currency";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BillingPlansSkeleton } from "@/components/billing/BillingSkeletons";
import { BillingBackLink, PlanCard, type PlanCardData } from "@/components/billing/PlanLimitsCard";

export function BillingPlansClient({ variant = "portal" }: { variant?: "portal" | "marketing" }) {
  const t = useTranslations("billingPage");
  const locale = useLocale();
  const isBr = isBrBillingMode(locale);
  const isMarketing = variant === "marketing";
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
    <div className={`mx-auto max-w-6xl space-y-8 pb-4 ${isMarketing ? "px-0" : ""}`}>
      {!isMarketing ? <BillingBackLink href="/billing" /> : null}

      {!isMarketing ? (
        <div className="text-center">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[var(--text-main)]">{t("plansTitle")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-dim)]">{t("plansSubtitle")}</p>
        </div>
      ) : null}

      <div className="flex justify-center">
        <div
          className={`inline-flex rounded-2xl border p-1.5 shadow-inner ${
            isMarketing
              ? "border-white/10 bg-white/5"
              : "border-[var(--border-color)] bg-slate-100/80"
          }`}
        >
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-xl px-6 py-2.5 text-sm font-bold transition ${
              cycle === "monthly"
                ? isMarketing
                  ? "bg-white/10 text-white shadow-sm"
                  : "bg-white text-[var(--text-main)] shadow-sm"
                : isMarketing
                  ? "text-violet-200/60 hover:text-white"
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
                ? isMarketing
                  ? "bg-white/10 text-white shadow-sm"
                  : "bg-white text-[var(--text-main)] shadow-sm"
                : isMarketing
                  ? "text-violet-200/60 hover:text-white"
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
          <PlanCard key={p.id} plan={p} cycle={cycle} featured={p.slug === "advanced"} variant={variant} />
        ))}
      </div>

      <p
        className={`text-center text-xs ${isMarketing ? "text-violet-200/50" : "text-[var(--text-dimmer)]"}`}
      >
        {isBr ? t("plansFootnoteBr") : t("plansFootnote")}{" "}
        {!isMarketing ? (
          <Link href="/billing" className="ui-link">
            {t("backToPortal")}
          </Link>
        ) : null}
      </p>
    </div>
  );
}
