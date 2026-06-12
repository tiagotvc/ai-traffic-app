"use client";

import { useTranslations } from "next-intl";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sub, setSub] = useState<{
    status: string;
    billingCycle: string;
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("portalTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("portalSubtitle")}</p>
        </div>
        <Link
          href="/billing/plans"
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700"
        >
          {t("viewPlans")}
        </Link>
      </div>

      {message ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          {message}
        </div>
      ) : null}

      {sub?.status === "past_due" || sub?.status === "suspended" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {sub.status === "suspended" ? t("statusSuspended") : t("statusPastDue")}
          <Link href="/billing/plans" className="ml-2 font-semibold text-violet-700 underline">
            {t("regularize")}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
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
              title={t("upgradeTo", { plan: nextPlan.name })}
              description={t("upgradePromoDesc", { percent: DEFAULT_UPGRADE_DISCOUNT })}
              discountPercent={DEFAULT_UPGRADE_DISCOUNT}
              planName={nextPlan.name}
              ctaHref={`/billing/checkout?plan=${nextPlan.id}`}
              ctaLabel={t("upgradeNow")}
            />
          ) : null}

          {isPaidPlan ? <BillingAddonsCard /> : null}
        </div>

        {planLimits && entitlements ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t("limitsTitle")}
            </h2>
            <BillingLimitsPanel limits={planLimits} usage={entitlements.usage} />
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 font-semibold text-slate-900">
          {t("invoicesTitle")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("colDate")}</th>
                <th className="px-5 py-3 text-center">{t("colAmount")}</th>
                <th className="px-5 py-3">{t("colStatus")}</th>
                <th className="px-5 py-3">{t("colNf")}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const { symbol, amount } = formatBillingAmountParts(inv.amountCents, inv.provider);
                const isPending = inv.status === "pending" || inv.status === "confirmed";
                const isPaid = inv.status === "paid";
                return (
                  <tr key={inv.id} className="transition hover:bg-violet-50/30">
                    <td className="px-5 py-4">
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
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`text-lg font-bold tabular-nums ${
                          isPaid ? "text-emerald-600" : isPending ? "text-violet-600" : "text-slate-700"
                        }`}
                      >
                        {symbol}
                        {amount}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-4">
                      <NfStatusBadge status={inv.nfStatus} pdfUrl={inv.nfPdfUrl} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => openDrawer(inv.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
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
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    {t("noInvoices")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {refundInvoiceId ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 font-semibold text-slate-900">
          {t("eventsTitle")}
        </h2>
        <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto text-sm">
          {events.map((ev) => (
            <li key={ev.id} className="flex justify-between gap-4 px-5 py-3 text-slate-600">
              <span>
                <span className="font-medium text-slate-800">{ev.eventType}</span>
                <span className="text-slate-400"> · {ev.provider}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {new Date(ev.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
          {events.length === 0 ? (
            <li className="px-5 py-8 text-center text-slate-500">{t("noEvents")}</li>
          ) : null}
        </ul>
      </div>

      <BillingInvoiceDrawer
        invoiceId={drawerInvoiceId}
        open={Boolean(drawerInvoiceId)}
        onClose={closeDrawer}
        onUpdated={reload}
      />
    </div>
  );
}
