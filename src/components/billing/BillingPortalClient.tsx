"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BillingAddonsCard } from "@/components/billing/BillingAddonsCard";
import { BillingInvoiceDrawer } from "@/components/billing/BillingInvoiceDrawer";
import { BillingPortalSkeleton } from "@/components/billing/BillingSkeletons";
import {
  DEFAULT_UPGRADE_DISCOUNT,
  formatBillingAmountParts,
  InvoiceStatusBadge,
  NfStatusBadge,
  UpgradePromoCard
} from "@/components/billing/billing-ui";
import { isDueDateValid } from "@/lib/billing/dates";
import { BillingLimitsPanel } from "@/components/billing/BillingLimitsPanel";
import { BillingPlanCard } from "@/components/billing/BillingPlanCard";
import type { PlanCardData } from "@/components/billing/PlanLimitsCard";
import type { Entitlements, PlanLimits } from "@/lib/billing/types";

type InvoiceRow = {
  id: string;
  amountCents: number;
  status: string;
  provider: string;
  billingType?: string | null;
  paidAt?: string | null;
  dueDate?: string | null;
  nfStatus: string;
  nfPdfUrl?: string | null;
  createdAt: string;
};

type EventRow = {
  id: string;
  eventType: string;
  provider: string;
  createdAt: string;
};

const NEXT_PLAN_SLUG: Record<string, string> = {
  free: "basic",
  basic: "advanced",
  advanced: "agency"
};

export function BillingPortalClient() {
  const t = useTranslations("billingPage");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sub, setSub] = useState<{
    status: string;
    billingCycle: string;
    paymentProvider?: string | null;
    plan: {
      id?: string;
      slug: string;
      name: string;
      trialDays?: number;
      limits: PlanLimits;
    } | null;
    currentPeriodEnd?: string | null;
    currentPeriodStart?: string | null;
    cancelAtPeriodEnd?: boolean;
  } | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [plans, setPlans] = useState<PlanCardData[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerInvoiceId, setDrawerInvoiceId] = useState<string | null>(null);
  const [refundInvoiceId, setRefundInvoiceId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [canManageBilling, setCanManageBilling] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/billing/subscription").then((r) => r.json()),
      fetch("/api/billing/invoices").then((r) => r.json()),
      fetch("/api/billing/plans").then((r) => r.json())
    ])
      .then(([subJ, invJ, plansJ]) => {
        if (subJ.ok) {
          setSub(subJ.subscription);
          setEntitlements(subJ.entitlements);
        }
        if (invJ.ok) {
          setInvoices(invJ.invoices ?? []);
          setEvents(invJ.events ?? []);
        }
        if (plansJ.ok) setPlans(plansJ.plans ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      setMessage(t("checkoutSuccessProcessing"));
      reload();
    }
  }, [searchParams, t, reload]);

  async function openStripePortal() {
    const res = await fetch("/api/billing/stripe/portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale })
    });
    const j = await res.json();
    if (j.ok && j.portalUrl) window.location.href = j.portalUrl;
    else setMessage(j.error ?? t("checkoutError"));
  }

  useEffect(() => {
    const id = searchParams.get("invoice");
    if (id) setDrawerInvoiceId(id);
  }, [searchParams]);

  function closeDrawer() {
    setDrawerInvoiceId(null);
    if (searchParams.get("invoice")) {
      router.replace("/billing");
    }
  }

  function openDrawer(id: string) {
    setDrawerInvoiceId(id);
    router.replace(`/billing?invoice=${id}`, { scroll: false });
  }

  async function cancelSub() {
    if (!confirm(t("cancelConfirm"))) return;
    const res = await fetch("/api/billing/subscription/cancel", { method: "POST" });
    const j = await res.json();
    setMessage(j.ok ? t("cancelScheduled") : j.error);
    reload();
  }

  async function requestRefund() {
    if (!refundInvoiceId || refundReason.length < 5) return;
    const res = await fetch("/api/billing/refunds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invoiceId: refundInvoiceId, reason: refundReason })
    });
    const j = await res.json();
    setMessage(j.ok ? t("refundRequested") : j.error);
    setRefundReason("");
    setRefundInvoiceId("");
  }

  if (loading) {
    return <BillingPortalSkeleton />;
  }

  const planLimits = sub?.plan?.limits ?? entitlements?.limits;
  const planSlug = sub?.plan?.slug ?? "free";
  const isPaidPlan = planSlug !== "free" && sub?.status === "active";
  const nextSlug = NEXT_PLAN_SLUG[planSlug];
  const nextPlan = plans.find((p) => p.slug === nextSlug);
  const showUpgrade = Boolean(nextPlan && planSlug !== "agency");

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {t("portalTitle")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">{t("portalSubtitle")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {canManageBilling && sub?.paymentProvider === "stripe" && isPaidPlan ? (
            <button
              type="button"
              onClick={openStripePortal}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              {t("updatePaymentMethod")}
            </button>
          ) : null}
          <Link
            href="/billing/plans"
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500"
          >
            {t("viewPlans")}
          </Link>
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
          {message}
        </div>
      ) : null}

      {sub?.status === "past_due" || sub?.status === "suspended" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {sub.status === "suspended" ? t("statusSuspended") : t("statusPastDue")}
          <Link href="/billing/plans" className="ml-2 font-semibold text-violet-700 underline">
            {t("regularize")}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-4">
          <BillingPlanCard
            plan={sub?.plan ?? null}
            status={sub?.status ?? "active"}
            billingCycle={sub?.billingCycle}
            currentPeriodStart={sub?.currentPeriodStart}
            currentPeriodEnd={sub?.currentPeriodEnd}
            cancelAtPeriodEnd={sub?.cancelAtPeriodEnd}
            onCancel={
              canManageBilling && sub?.plan?.slug !== "free" && sub?.status === "active"
                ? cancelSub
                : undefined
            }
            canManageBilling={canManageBilling}
          />

          {showUpgrade && nextPlan ? (
            <UpgradePromoCard
              compact
              title={t("upgradeTo", { plan: nextPlan.name })}
              description={t("upgradePromoDesc", { percent: DEFAULT_UPGRADE_DISCOUNT })}
              discountPercent={DEFAULT_UPGRADE_DISCOUNT}
              planName={nextPlan.name}
              ctaHref={`/billing/checkout?plan=${nextPlan.id}`}
              ctaLabel={t("upgradeNow")}
            />
          ) : null}
        </div>

        {planLimits && entitlements ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-8">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">{t("limitsTitle")}</h2>
              <p className="text-[11px] text-slate-500">{t("limitsSubtitle")}</p>
            </div>
            <BillingLimitsPanel limits={planLimits} usage={entitlements.usage} />
          </div>
        ) : null}
      </div>

      {isPaidPlan ? <BillingAddonsCard /> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{t("invoicesTitle")}</h2>
              <p className="text-[11px] text-slate-500">{t("invoicesSubtitle")}</p>
            </div>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {invoices.length}
            </span>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="bg-white text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">{t("colDate")}</th>
                <th className="px-4 py-2 text-center">{t("colAmount")}</th>
                <th className="px-4 py-2">{t("colStatus")}</th>
                <th className="px-4 py-2">{t("colNf")}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const { symbol, amount } = formatBillingAmountParts(inv.amountCents, inv.provider);
                const isPending = inv.status === "pending" || inv.status === "confirmed";
                const isPaid = inv.status === "paid";
                return (
                  <tr key={inv.id} className="transition hover:bg-violet-50/40">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">
                        {new Date(inv.createdAt).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                      {inv.dueDate && isDueDateValid(inv.dueDate, inv.createdAt) ? (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {t("dueDate")}: {new Date(inv.dueDate + "T12:00:00").toLocaleDateString()}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`text-base font-bold tabular-nums ${
                          isPaid ? "text-emerald-600" : isPending ? "text-violet-600" : "text-slate-700"
                        }`}
                      >
                        {symbol}
                        {amount}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <NfStatusBadge status={inv.nfStatus} pdfUrl={inv.nfPdfUrl} />
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => openDrawer(inv.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 transition hover:bg-violet-100"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {t("details")}
                      </button>
                      {inv.status === "paid" ? (
                        <button
                          type="button"
                          className="ml-2 text-xs text-slate-400 underline hover:text-slate-600"
                          onClick={() => setRefundInvoiceId(inv.id)}
                        >
                          {t("requestRefund")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    {t("noInvoices")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-1">
          <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-slate-900">{t("eventsTitle")}</h2>
            <p className="text-[11px] text-slate-500">{t("eventsSubtitle")}</p>
          </div>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto text-xs">
            {events.map((ev) => (
              <li key={ev.id} className="px-4 py-2.5 text-slate-600">
                <p className="font-medium text-slate-800">{ev.eventType}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {ev.provider} · {new Date(ev.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
            {events.length === 0 ? (
              <li className="px-4 py-8 text-center text-slate-500">{t("noEvents")}</li>
            ) : null}
          </ul>
        </div>
      </div>

      {refundInvoiceId ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900">{t("refundTitle")}</h3>
          <textarea
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder={t("refundReason")}
            className="ui-input mt-3 w-full min-h-[80px]"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={requestRefund} className="ui-btn-primary text-sm">
              {t("submitRefund")}
            </button>
            <button type="button" onClick={() => setRefundInvoiceId("")} className="ui-btn-secondary text-sm">
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : null}

      <BillingInvoiceDrawer
        invoiceId={drawerInvoiceId}
        open={Boolean(drawerInvoiceId)}
        onClose={closeDrawer}
        onUpdated={reload}
      />
    </div>
  );
}
