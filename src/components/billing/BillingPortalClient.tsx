"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BillingAddonsCard } from "@/components/billing/BillingAddonsCard";
import { BillingInvoicesTable } from "@/components/billing/BillingInvoicesTable";
import { BillingPortalSkeleton } from "@/components/billing/BillingSkeletons";
import {
  DEFAULT_UPGRADE_DISCOUNT,
  UpgradePromoCard
} from "@/components/billing/billing-ui";
import { BillingLimitsPanel } from "@/components/billing/BillingLimitsPanel";
import { BillingPlanCard } from "@/components/billing/BillingPlanCard";
import { PageTabs } from "@/components/layout/PageTabs";
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

type PortalTab = "plan" | "limits" | "billing" | "events";

export type { PortalTab };

const NEXT_PLAN_SLUG: Record<string, string> = {
  free: "basic",
  basic: "advanced",
  advanced: "agency"
};

const VALID_TABS = new Set<PortalTab>(["plan", "limits", "billing", "events"]);

export function parseBillingTab(raw: string | null): PortalTab {
  if (raw && VALID_TABS.has(raw as PortalTab)) return raw as PortalTab;
  return "plan";
}

function parseTab(raw: string | null): PortalTab {
  return parseBillingTab(raw);
}

export function BillingPortalClient({
  embedded = false,
  basePath = "/billing",
  activeTab: controlledTab,
  onActiveTabChange
}: {
  embedded?: boolean;
  basePath?: string;
  activeTab?: PortalTab;
  onActiveTabChange?: (tab: PortalTab) => void;
} = {}) {
  const t = useTranslations("billingPage");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [internalTab, setInternalTab] = useState<PortalTab>(() =>
    parseTab(searchParams.get("tab"))
  );
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onActiveTabChange ?? setInternalTab;
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
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
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

  useEffect(() => {
    const tab = parseTab(searchParams.get("tab"));
    if (VALID_TABS.has(tab)) {
      setActiveTab(tab);
    }
    const invoiceId = searchParams.get("invoice");
    if (invoiceId) {
      setActiveTab("billing");
      setExpandedInvoiceId(invoiceId);
    }
  }, [searchParams, setActiveTab]);

  function selectTab(tab: PortalTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    if (tab !== "billing") {
      params.delete("invoice");
      setExpandedInvoiceId(null);
    }
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }

  function toggleInvoice(id: string) {
    const next = expandedInvoiceId === id ? null : id;
    setExpandedInvoiceId(next);
    setActiveTab("billing");
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "billing");
    if (next) params.set("invoice", next);
    else params.delete("invoice");
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }

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

  const tabs = [
    { key: "plan" as const, label: t("tabPlan") },
    { key: "limits" as const, label: t("tabLimits") },
    { key: "billing" as const, label: t("tabBilling"), badge: invoices.length > 0 ? invoices.length : undefined },
    { key: "events" as const, label: t("tabEvents") }
  ];

  const panels = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {activeTab === "plan" ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
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
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-sm font-semibold text-slate-800">{t("planTabHintTitle")}</p>
                    <p className="mt-1 text-xs text-slate-500">{t("planTabHintBody")}</p>
                  </div>
                )}
              </div>

              {isPaidPlan ? <BillingAddonsCard /> : null}
            </div>
          ) : null}

          {activeTab === "limits" && planLimits && entitlements ? (
            <div>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-slate-900">{t("limitsTitle")}</h2>
                <p className="text-[11px] text-slate-500">{t("limitsSubtitle")}</p>
              </div>
              <BillingLimitsPanel limits={planLimits} usage={entitlements.usage} />
            </div>
          ) : null}

          {activeTab === "billing" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{t("invoicesTitle")}</h2>
                <p className="text-[11px] text-slate-500">{t("invoicesSubtitle")}</p>
              </div>

              <BillingInvoicesTable
                invoices={invoices}
                expandedId={expandedInvoiceId}
                onToggle={toggleInvoice}
                onRequestRefund={(id) => {
                  setRefundInvoiceId(id);
                  setExpandedInvoiceId(id);
                }}
                onUpdated={reload}
              />

              {refundInvoiceId ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">{t("refundTitle")}</h3>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder={t("refundReason")}
                    className="ui-input mt-2 w-full min-h-[72px] text-xs"
                  />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={requestRefund} className="ui-btn-primary text-xs">
                      {t("submitRefund")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundInvoiceId("")}
                      className="ui-btn-secondary text-xs"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "events" ? (
            <div>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-slate-900">{t("eventsTitle")}</h2>
                <p className="text-[11px] text-slate-500">{t("eventsSubtitle")}</p>
              </div>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 text-xs">
                {events.map((ev) => (
                  <li key={ev.id} className="px-3 py-2.5 text-slate-600">
                    <p className="font-medium text-slate-800">{ev.eventType}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {ev.provider} · {new Date(ev.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
                {events.length === 0 ? (
                  <li className="px-3 py-8 text-center text-slate-500">{t("noEvents")}</li>
                ) : null}
              </ul>
            </div>
          ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
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

        {panels}
      </div>
    );
  }

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

      <div className="space-y-4">
        <PageTabs tabs={tabs} active={activeTab} onChange={selectTab} />
        {panels}
      </div>
    </div>
  );
}
