"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BillingBackLink, type PlanCardData } from "@/components/billing/PlanLimitsCard";
import { formatMoney, type PricingBreakdown } from "@/lib/billing/pricing";

type CardProcessingProps = {
  invoiceId: string;
  plan: PlanCardData;
  cycle: "monthly" | "yearly";
  pricing: PricingBreakdown;
  currency?: string;
  locale: string;
};

export function BillingCardProcessing({
  invoiceId,
  plan,
  cycle,
  pricing,
  currency = "BRL",
  locale
}: CardProcessingProps) {
  const t = useTranslations("billingPage");
  const router = useRouter();
  const [paid, setPaid] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/billing/invoices/${invoiceId}`);
        const j = await res.json();
        if (!active) return;
        const status = j.invoice?.status;
        if (status === "paid") {
          setPaid(true);
          setTimeout(() => router.push(`/${locale}/billing?checkout=success`), 1200);
        } else if (status === "canceled" || status === "overdue") {
          setFailed(true);
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [invoiceId, locale, router]);

  const period = cycle === "yearly" ? t("perYear") : t("perMonth");

  return (
    <div className="mx-auto max-w-md space-y-5">
      <BillingBackLink href="/billing" />

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg">
        <div className="bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-500 px-6 py-5 text-white">
          <h1 className="text-xl font-bold">{t("cardProcessingTitle")}</h1>
          <p className="mt-2 text-sm text-violet-100">{t("cardProcessingHint")}</p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">{plan.name}</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatMoney(pricing.finalCents, currency)}
              <span className="ml-1 text-sm font-normal text-slate-500">{period}</span>
            </p>
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">
                ✓
              </span>
              <p className="text-lg font-semibold text-emerald-800">{t("cardPaidTitle")}</p>
              <p className="text-sm text-emerald-700">{t("cardPaidHint")}</p>
            </div>
          ) : failed ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {t("cardFailedHint")}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
              {t("cardWaiting")}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <Link
            href="/billing"
            className="block rounded-xl py-2.5 text-center text-sm font-semibold text-violet-600 transition hover:bg-violet-50"
          >
            {t("backToPortal")}
          </Link>
        </div>
      </div>
    </div>
  );
}
