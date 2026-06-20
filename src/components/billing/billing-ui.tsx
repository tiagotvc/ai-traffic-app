"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveBillingCurrency } from "@/lib/billing/currency";
import { formatMoney, formatMoneyParts, MONTHLY_PIX_DISCOUNT_PERCENT } from "@/lib/billing/pricing";

export type InvoiceStatusKey =
  | "pending"
  | "confirmed"
  | "paid"
  | "overdue"
  | "refunded"
  | "canceled";

export type NfStatusKey = "pending" | "issued" | "error" | "not_applicable";

const INVOICE_STATUS_STYLE: Record<
  InvoiceStatusKey,
  { dot: string; bg: string; text: string }
> = {
  pending: { dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-800" },
  confirmed: { dot: "bg-sky-400", bg: "bg-sky-50", text: "text-sky-800" },
  paid: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800" },
  overdue: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-800" },
  refunded: { dot: "bg-slate-400", bg: "bg-slate-100", text: "text-[var(--text-dim)]" },
  canceled: { dot: "bg-slate-300", bg: "bg-slate-100", text: "text-[var(--text-dim)]" }
};

const NF_STATUS_STYLE: Record<NfStatusKey, { dot: string; bg: string; text: string }> = {
  pending: { dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-800" },
  issued: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800" },
  error: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-800" },
  not_applicable: { dot: "bg-slate-300", bg: "bg-[var(--surface-thead)]", text: "text-[var(--text-dim)]" }
};

const SUB_STATUS_STYLE: Record<string, { dot: string; bg: string; text: string }> = {
  trialing: { dot: "bg-[rgba(124,58,237,0.06)]0", bg: "bg-[rgba(124,58,237,0.06)]", text: "text-[var(--violet)]" },
  active: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800" },
  past_due: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-900" },
  suspended: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-800" },
  canceled: { dot: "bg-slate-400", bg: "bg-slate-100", text: "text-[var(--text-dim)]" }
};

export function billingCurrency(provider?: string, locale?: string | null) {
  const p = provider === "asaas" ? "asaas" : provider === "stripe" ? "stripe" : null;
  return resolveBillingCurrency(locale, p);
}

export function formatBillingAmount(cents: number, provider?: string, locale?: string | null) {
  return formatMoney(cents, billingCurrency(provider, locale));
}

export function formatBillingAmountParts(cents: number, provider?: string, locale?: string | null) {
  const currency = billingCurrency(provider, locale);
  const parts = formatMoneyParts(cents, currency);
  if (currency === "BRL") {
    return { symbol: "R$", amount: parts.amount, currency, full: parts.full };
  }
  return { symbol: parts.symbol, amount: parts.amount, currency, full: parts.full };
}

export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const ms = new Date(dateIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function StatusBadge({
  label,
  style
}: {
  label: string;
  style: { dot: string; bg: string; text: string };
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const t = useTranslations("billingPage");
  const key = (status in INVOICE_STATUS_STYLE ? status : "pending") as InvoiceStatusKey;
  const labels: Record<InvoiceStatusKey, string> = {
    pending: t("invoiceStatusPending"),
    confirmed: t("invoiceStatusConfirmed"),
    paid: t("invoiceStatusPaid"),
    overdue: t("invoiceStatusOverdue"),
    refunded: t("invoiceStatusRefunded"),
    canceled: t("invoiceStatusCanceled")
  };
  return <StatusBadge label={labels[key]} style={INVOICE_STATUS_STYLE[key]} />;
}

export function NfStatusBadge({ status, pdfUrl }: { status: string; pdfUrl?: string | null }) {
  const t = useTranslations("billingPage");
  const key = (status in NF_STATUS_STYLE ? status : "pending") as NfStatusKey;
  const labels: Record<NfStatusKey, string> = {
    pending: t("nfStatusPending"),
    issued: t("nfStatusIssued"),
    error: t("nfStatusError"),
    not_applicable: t("nfStatusNa")
  };
  if (key === "issued" && pdfUrl) {
    return (
      <a
        href={pdfUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs ui-link"
      >
        {t("downloadNf")}
      </a>
    );
  }
  return <StatusBadge label={labels[key]} style={NF_STATUS_STYLE[key]} />;
}

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const t = useTranslations("billingPage");
  const labels: Record<string, string> = {
    trialing: t("subStatusTrialing"),
    active: t("subStatusActive"),
    past_due: t("subStatusPastDue"),
    suspended: t("subStatusSuspended"),
    canceled: t("subStatusCanceled")
  };
  const style = SUB_STATUS_STYLE[status] ?? SUB_STATUS_STYLE.active;
  return <StatusBadge label={labels[status] ?? status} style={style} />;
}

export function BillingDrawerShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  headerExtra
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="close"
        className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-[201] flex h-dvh w-full max-w-[420px] flex-col bg-white shadow-2xl">
        <header className="shrink-0 bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 px-6 pb-6 pt-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {subtitle ? (
                <p className="truncate text-xs font-medium text-violet-200">{subtitle}</p>
              ) : null}
              <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg transition hover:bg-white/25"
            >
              ×
            </button>
          </div>
          {headerExtra ? <div className="mt-5">{headerExtra}</div> : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface-thead)]/50 px-6 py-5">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-[var(--border-color)] bg-white px-6 py-4">{footer}</footer>
        ) : null}
      </aside>
    </>,
    document.body
  );
}

export function UpgradePromoCard({
  title,
  description,
  discountPercent,
  ctaHref,
  ctaLabel,
  planName,
  compact = false
}: {
  title: string;
  description: string;
  discountPercent: number;
  ctaHref: string;
  ctaLabel: string;
  planName?: string;
  compact?: boolean;
}) {
  const t = useTranslations("billingPage");
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-700 text-white shadow-sm ${
        compact
          ? "rounded-xl border border-violet-400/30 p-4"
          : "rounded-2xl border-2 border-violet-300/50 p-6 shadow-xl shadow-violet-300/40 ring-1 ring-violet-400/30"
      }`}
    >
      {!compact ? (
        <>
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 left-4 h-20 w-20 rounded-full bg-white/5" />
        </>
      ) : null}
      <div className={`relative ${compact ? "space-y-2.5" : "space-y-4"}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-700">
            {t("upgradePromoBadge", { percent: discountPercent })}
          </span>
          {planName ? (
            <span className="rounded-full bg-violet-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-100">
              {planName}
            </span>
          ) : null}
        </div>
        <div>
          <h3 className={`font-bold tracking-tight ${compact ? "text-sm" : "text-xl font-extrabold"}`}>
            {title}
          </h3>
          <p className={`text-violet-100 ${compact ? "mt-0.5 text-[11px] leading-snug" : "mt-1.5 text-sm leading-relaxed"}`}>
            {description}
          </p>
        </div>
        <Link
          href={ctaHref}
          className={`flex w-full items-center justify-center gap-1.5 rounded-lg bg-white font-bold text-violet-700 transition hover:bg-[rgba(124,58,237,0.06)] ${
            compact ? "py-2 text-xs" : "rounded-xl py-3.5 text-sm font-extrabold shadow-lg hover:shadow-xl"
          }`}
        >
          {ctaLabel}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export const DEFAULT_UPGRADE_DISCOUNT = MONTHLY_PIX_DISCOUNT_PERCENT;
