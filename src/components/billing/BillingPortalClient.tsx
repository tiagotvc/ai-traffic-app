"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Calendar, FileSearch, History, Info, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  DsEyebrow,
  DsFlatDivider,
  DsFlatEmptyState,
  DsFlatSection,
  DsPageHeader,
  DsUnderlineTabs
} from "@/design-system";
import { BillingInvoicesTable } from "@/components/billing/BillingInvoicesTable";
import { BillingPortalSkeleton } from "@/components/billing/BillingSkeletons";
import { BillingLimitsPanel } from "@/components/billing/BillingLimitsPanel";
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

const VALID_TABS = new Set<PortalTab>(["plan", "limits", "billing", "events"]);
const LEGACY_EMBEDDED_TABS = new Set(["limits", "billing", "events"]);

export function parseBillingTab(raw: string | null): PortalTab {
  if (raw === "limits") return "plan";
  if (raw && VALID_TABS.has(raw as PortalTab)) return raw as PortalTab;
  return "plan";
}

function readEmbeddedPortalTab(searchParams: URLSearchParams): PortalTab {
  const section = searchParams.get("section");
  if (section === "limits") return "plan";
  if (section && VALID_TABS.has(section as PortalTab)) return section as PortalTab;

  const mainTab = searchParams.get("tab");
  if (mainTab === "plan") return "plan";
  if (mainTab && LEGACY_EMBEDDED_TABS.has(mainTab)) {
    return mainTab === "limits" ? "plan" : (mainTab as PortalTab);
  }
  return "plan";
}

function readPortalTab(searchParams: URLSearchParams, embedded: boolean): PortalTab {
  if (embedded) return readEmbeddedPortalTab(searchParams);
  return parseBillingTab(searchParams.get("tab"));
}

function applyPortalTabToParams(
  params: URLSearchParams,
  tab: PortalTab,
  embedded: boolean
): void {
  if (embedded) {
    params.set("tab", "plan");
    if (tab === "plan") params.delete("section");
    else params.set("section", tab);
    return;
  }
  params.set("tab", tab);
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
    readPortalTab(searchParams, embedded)
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
      fetch("/api/billing/invoices").then((r) => r.json())
    ])
      .then(([subJ, invJ]) => {
        if (subJ.ok) {
          setSub(subJ.subscription);
          setEntitlements(subJ.entitlements);
        }
        if (invJ.ok) {
          setInvoices(invJ.invoices ?? []);
          setEvents(invJ.events ?? []);
        }
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
    const invoiceId = searchParams.get("invoice");
    const tab = invoiceId ? "billing" : readPortalTab(searchParams, embedded);
    setActiveTab(tab);
    if (invoiceId) setExpandedInvoiceId(invoiceId);

    if (!embedded) return;

    const mainTab = searchParams.get("tab");
    const section = searchParams.get("section");
    const isCanonical =
      mainTab === "plan" &&
      section !== "limits" &&
      (tab === "plan" ? !section : section === tab);

    if (isCanonical && !LEGACY_EMBEDDED_TABS.has(mainTab ?? "")) return;

    const params = new URLSearchParams(searchParams.toString());
    applyPortalTabToParams(params, tab, true);
    if (invoiceId) params.set("invoice", invoiceId);
    else params.delete("invoice");
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }, [searchParams, embedded, setActiveTab, router, basePath]);

  function selectTab(tab: PortalTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    applyPortalTabToParams(params, tab, embedded);
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
    applyPortalTabToParams(params, "billing", embedded);
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
    return <BillingPortalSkeleton embedded={embedded} />;
  }

  const planLimits = sub?.plan?.limits ?? entitlements?.limits;
  const planSlug = sub?.plan?.slug ?? "free";
  const isPaidPlan = planSlug !== "free" && sub?.status === "active";

  const planName = sub?.plan?.name ?? "Free";
  const cycleLabel = sub?.billingCycle === "yearly" ? t("yearly") : t("monthly");
  const renewalDateStr = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : null;
  const tabs = [
    { key: "plan" as const, label: t("tabPlan") },
    {
      key: "billing" as const,
      label: t("tabBilling"),
      badge: invoices.length > 0 ? invoices.length : undefined
    },
    { key: "events" as const, label: t("tabEvents") }
  ];

  const panels = (
    <div>
      {activeTab === "plan" ? (
        <div className="space-y-5">
          {isPaidPlan ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span className="font-medium text-[var(--text-main)]">{t("planTabHintTitle")}</span>
              {renewalDateStr ? (
                <span className="text-[var(--text-dim)]">
                  · {t("nextRenewal")} {renewalDateStr}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <DsEyebrow>{t("currentPlan")}</DsEyebrow>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-2xl font-bold leading-tight text-[var(--text-main)]">
                  {planName}
                </h2>
                {isPaidPlan ? (
                  <span className="rounded-full bg-[var(--ui-accent-muted-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ui-accent)]">
                    {cycleLabel}
                  </span>
                ) : null}
              </div>
              {renewalDateStr && !isPaidPlan ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-dim)]">
                  <Calendar size={13} className="shrink-0 text-[var(--ui-accent)]" />
                  {t("nextRenewal")} {renewalDateStr}
                </p>
              ) : null}
            </div>
            <Link href="/billing/plans" className="ui-btn-secondary shrink-0 text-xs">
              {t("viewPlans")}
            </Link>
          </div>

          {planLimits && entitlements ? (
            <DsFlatSection
              title={t("limitsTitle")}
              subtitle={t("limitsSubtitle")}
              titleClassName="text-sm"
              className="space-y-3"
            >
              <BillingLimitsPanel compact limits={planLimits} usage={entitlements.usage} />
              {isPaidPlan ? (
                <Link href="/billing/addons" className="ui-link inline-flex text-xs">
                  {t("addonsCta")} →
                </Link>
              ) : null}
            </DsFlatSection>
          ) : null}

          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-[var(--text-dimmer)]">
            <Info size={14} className="mt-0.5 shrink-0 opacity-70" />
            {canManageBilling && isPaidPlan ? (
              <button type="button" onClick={cancelSub} className="ui-link text-left">
                {sub?.cancelAtPeriodEnd ? t("cancelPending") : t("cancelSubscription")}
              </button>
            ) : (
              t("cancelContactAdmin")
            )}
          </p>
        </div>
      ) : null}

      {activeTab === "billing" ? (
            <div className="space-y-6">
              <DsFlatSection
                title={t("invoicesTitle")}
                subtitle={t("invoicesSubtitle")}
                titleClassName="text-base"
                className="mt-5 space-y-5"
              >
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
              </DsFlatSection>

              {refundInvoiceId ? (
                <>
                  <DsFlatDivider />
                  <DsFlatSection title={t("refundTitle")}>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder={t("refundReason")}
                      className="ui-input mt-3 w-full min-h-[72px] text-xs"
                    />
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={requestRefund} className="ui-btn-accent text-xs">
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
                  </DsFlatSection>
                </>
              ) : null}
            </div>
          ) : null}

          {activeTab === "events" ? (
            <DsFlatSection
              title={t("eventsTitle")}
              subtitle={t("eventsSubtitle")}
              titleClassName="text-base"
              titleIcon={<History size={16} strokeWidth={2} />}
              className="mt-5 space-y-5"
            >
              {events.length > 0 ? (
                <ul className="divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] text-xs">
                  {events.map((ev) => (
                    <li key={ev.id} className="px-4 py-3.5 text-[var(--text-dim)]">
                      <p className="font-medium text-[var(--text-main)]">{ev.eventType}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-dimmer)]">
                        {ev.provider} · {new Date(ev.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <DsFlatEmptyState
                  variant="card"
                  bordered={false}
                  icon={<FileSearch size={24} strokeWidth={1.75} />}
                  title={t("noEvents")}
                  description={t("eventsEmptyHint")}
                />
              )}
            </DsFlatSection>
          ) : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        {message ? (
          <div className="ui-alert-info px-3 py-2 text-xs">
            {message}
          </div>
        ) : null}

        {sub?.status === "past_due" || sub?.status === "suspended" ? (
          <div className="ui-alert-warning px-3 py-2 text-xs">
            {sub.status === "suspended" ? t("statusSuspended") : t("statusPastDue")}
            <Link href="/billing/plans" className="ui-link ml-2">
              {t("regularize")}
            </Link>
          </div>
        ) : null}

        <DsUnderlineTabs tabs={tabs} active={activeTab} onChange={selectTab} accent="brand" />
        {panels}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <DsPageHeader
        title={t("portalTitle")}
        subtitle={t("portalSubtitle")}
        actions={
          <>
            {canManageBilling && sub?.paymentProvider === "stripe" && isPaidPlan ? (
              <button type="button" onClick={openStripePortal} className="ui-btn-secondary text-xs">
                {t("updatePaymentMethod")}
              </button>
            ) : null}
            <Link href="/billing/plans" className="ui-btn-accent text-xs">
              {t("viewPlans")}
            </Link>
          </>
        }
      />

      {message ? (
        <div className="ui-alert-info px-3 py-2 text-xs">
          {message}
        </div>
      ) : null}

      {sub?.status === "past_due" || sub?.status === "suspended" ? (
        <div className="ui-alert-warning px-3 py-2 text-xs">
          {sub.status === "suspended" ? t("statusSuspended") : t("statusPastDue")}
          <Link href="/billing/plans" className="ui-link ml-2">
            {t("regularize")}
          </Link>
        </div>
      ) : null}

      <div className="space-y-4">
        <DsUnderlineTabs tabs={tabs} active={activeTab} onChange={selectTab} accent="brand" />
        {panels}
      </div>
    </div>
  );
}
