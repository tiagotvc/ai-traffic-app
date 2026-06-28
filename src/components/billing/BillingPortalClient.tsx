"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Calendar, FileSearch, History, Info, Sparkles, Timer, User, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  DsEyebrow,
  DsFlatChip,
  DsFlatDivider,
  DsFlatEmptyState,
  DsFlatSection,
  DsPageHeader,
  DsUnderlineTabs,
  dsAccentOutlineClass
} from "@/design-system";
import { BillingInvoicesTable } from "@/components/billing/BillingInvoicesTable";
import { BillingPortalSkeleton } from "@/components/billing/BillingSkeletons";
import { BillingLimitsPanel } from "@/components/billing/BillingLimitsPanel";
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
    return <BillingPortalSkeleton embedded={embedded} />;
  }

  const planLimits = sub?.plan?.limits ?? entitlements?.limits;
  const planSlug = sub?.plan?.slug ?? "free";
  const isPaidPlan = planSlug !== "free" && sub?.status === "active";
  const nextSlug = NEXT_PLAN_SLUG[planSlug];
  const nextPlan = plans.find((p) => p.slug === nextSlug);
  const showUpgrade = Boolean(nextPlan && planSlug !== "agency");
  void showUpgrade;
  void nextPlan;

  const planName = sub?.plan?.name ?? "Free";
  const cycleLabel = sub?.billingCycle === "yearly" ? t("yearly") : t("monthly");
  const renewalDateStr = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : null;
  const addonChips: { label: string; Icon: LucideIcon; bg: string; color: string }[] = [
    { label: t("addonClients"), Icon: User, bg: "var(--ui-accent-muted-strong)", color: "var(--ui-accent)" },
    { label: t("addonAds"), Icon: Timer, bg: "var(--ui-accent-muted)", color: "var(--ui-accent)" },
    { label: t("addonAi"), Icon: Sparkles, bg: "rgba(236,72,153,0.15)", color: "#f472b6" }
  ];

  const tabs = [
    { key: "plan" as const, label: t("tabPlan") },
    { key: "limits" as const, label: t("tabLimits") },
    { key: "billing" as const, label: t("tabBilling"), badge: invoices.length > 0 ? invoices.length : undefined },
    { key: "events" as const, label: t("tabEvents") }
  ];

  const panels = (
    <div>
      {activeTab === "plan" ? (
            <div className="space-y-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="mt-2">
                    <DsEyebrow>{t("currentPlan")}</DsEyebrow>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5">
                    <h2 className="font-heading text-4xl font-extrabold leading-none tracking-tight text-[var(--text-main)]">
                      {planName}
                    </h2>
                    {isPaidPlan ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {t("statusActiveShort")}
                        </span>
                        <span className="rounded-full bg-[var(--ui-accent-muted-strong)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ui-accent)]">
                          {cycleLabel}
                        </span>
                      </>
                    ) : null}
                  </div>

                  {renewalDateStr ? (
                    <div className="mt-5 flex items-start gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: "var(--ui-accent-muted)",
                          boxShadow: "0 0 24px var(--ui-accent-glow)"
                        }}
                      >
                        <Calendar size={18} className="text-[var(--ui-accent)]" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="mt-0.5">
                          <DsEyebrow className="tracking-[0.12em]">{t("nextRenewal")}</DsEyebrow>
                        </p>
                        <p className="mt-0.5 text-base font-bold text-[var(--text-main)]">{renewalDateStr}</p>
                        <p className="mt-0.5 text-xs font-medium text-[var(--ui-accent)]">
                          {t("renewalHint", { cycle: cycleLabel.toLowerCase() })}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <p className="mt-5 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--text-dimmer)]">
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

                <div className="flex items-center gap-4 lg:justify-end">
                  <div
                    className="relative flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center"
                    aria-hidden
                  >
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ background: "var(--ui-accent-gradient)" }}
                    />
                    <span
                      className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--ui-accent-ring)]"
                      style={{ background: "var(--ui-accent-muted)" }}
                    >
                      <Calendar size={26} className="text-[var(--ui-accent)]" strokeWidth={1.75} />
                    </span>
                  </div>
                  <div className="min-w-0 max-w-[14rem]">
                    <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
                      {t("planTabHintTitle")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
                      {t("planTabHintBody")}
                    </p>
                  </div>
                </div>
              </div>

              {isPaidPlan ? (
                <>
                  <div className="border-t border-[var(--border-color)]" />
                  <DsFlatSection
                    title={t("addonsTitle")}
                    subtitle={t("addonsSubtitle")}
                    actions={
                      <Link href="/billing/addons" className={dsAccentOutlineClass}>
                        {t("addonsCta")}
                        <span aria-hidden>→</span>
                      </Link>
                    }
                  >
                    <div className="flex flex-wrap gap-2.5">
                      {addonChips.map((chip) => (
                        <DsFlatChip
                          key={chip.label}
                          icon={<chip.Icon size={14} strokeWidth={2} />}
                          label={chip.label}
                          iconBackground={chip.bg}
                          iconColor={chip.color}
                        />
                      ))}
                    </div>
                  </DsFlatSection>
                </>
              ) : null}
            </div>
          ) : null}

          {activeTab === "limits" && planLimits && entitlements ? (
            <DsFlatSection
              title={t("limitsTitle")}
              subtitle={t("limitsSubtitle")}
              titleClassName="text-base"
              className="mt-5 space-y-4"
            >
              <BillingLimitsPanel limits={planLimits} usage={entitlements.usage} />
            </DsFlatSection>
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
