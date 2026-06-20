"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BillingDrawerSkeleton } from "@/components/billing/BillingSkeletons";
import { formatBillingAmountParts, InvoiceStatusBadge } from "@/components/billing/billing-ui";
import { isDueDateValid } from "@/lib/billing/dates";

export type InvoiceDetail = {
  id: string;
  amountCents: number;
  status: string;
  provider: string;
  billingType?: string | null;
  billingCycle?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt: string;
  description?: string | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  pixExpiresAt?: string | null;
  nfStatus?: string;
  nfPdfUrl?: string | null;
  invoiceUrl?: string | null;
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-card)] px-3 py-2 ring-1 ring-[var(--border-color)]">
      <dt className="text-xs text-[var(--text-dim)]">{label}</dt>
      <dd className="text-xs font-semibold text-[var(--text-main)]">{children}</dd>
    </div>
  );
}

export function BillingInvoiceDetailPanel({
  invoiceId,
  onUpdated,
  compact = false
}: {
  invoiceId: string;
  onUpdated?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("billingPage");
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceId}`);
      const j = await res.json();
      if (j.invoice) {
        setInvoice(j.invoice as InvoiceDetail);
        if (j.invoice.status === "paid") onUpdated?.();
      } else {
        setInvoice(null);
      }
    } finally {
      setLoading(false);
    }
  }, [invoiceId, onUpdated]);

  useEffect(() => {
    setInvoice(null);
    void load();
  }, [load]);

  useEffect(() => {
    if (!invoiceId) return;
    if (invoice?.status === "paid" || invoice?.status === "canceled") return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [invoiceId, invoice?.status, load]);

  const pixExpired =
    invoice?.pixExpiresAt != null && new Date(invoice.pixExpiresAt) < new Date();
  const canShowPix =
    invoice &&
    (invoice.status === "pending" || invoice.status === "confirmed") &&
    !pixExpired &&
    (invoice.pixQrCode || invoice.pixCopyPaste);

  async function copyPix() {
    if (!invoice?.pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(invoice.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  if (loading && !invoice) {
    return (
      <div className={compact ? "p-3" : "p-4"}>
        <BillingDrawerSkeleton />
      </div>
    );
  }

  if (!invoice) {
    return <p className="p-3 text-xs text-[var(--text-dim)]">{t("invoiceNotFound")}</p>;
  }

  const { symbol, amount } = formatBillingAmountParts(invoice.amountCents, invoice.provider);

  return (
    <div className={`space-y-3 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[rgba(124,58,237,0.15)] bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--violet)]">
            {t("invoiceDetail")}
          </p>
          {invoice.description ? (
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">{invoice.description}</p>
          ) : null}
          <div className="mt-1 flex items-end gap-0.5">
            <span className="pb-0.5 text-sm font-bold text-[var(--violet)]">{symbol}</span>
            <span className="text-2xl font-extrabold leading-none tracking-tight text-[var(--text-main)]">
              {amount}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <InvoiceStatusBadge status={invoice.status} />
          {invoice.billingCycle ? (
            <span className="rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">
              {invoice.billingCycle === "yearly" ? t("yearly") : t("monthly")}
            </span>
          ) : null}
        </div>
      </div>

      <dl className="space-y-1.5">
        <DetailRow label={t("colDate")}>
          {new Date(invoice.createdAt).toLocaleDateString()}
        </DetailRow>
        {invoice.dueDate && isDueDateValid(invoice.dueDate, invoice.createdAt) ? (
          <DetailRow label={t("dueDate")}>
            {new Date(invoice.dueDate + "T12:00:00").toLocaleDateString()}
          </DetailRow>
        ) : null}
        {invoice.pixExpiresAt ? (
          <DetailRow label={t("pixExpiresAt")}>
            <span className={pixExpired ? "text-red-600" : "text-emerald-600"}>
              {new Date(invoice.pixExpiresAt).toLocaleString()}
            </span>
          </DetailRow>
        ) : null}
        {invoice.paidAt ? (
          <DetailRow label={t("paidAt")}>
            {new Date(invoice.paidAt).toLocaleString()}
          </DetailRow>
        ) : null}
        {invoice.billingType ? (
          <DetailRow label={t("paymentMethod")}>
            {invoice.billingType === "PIX" ? "PIX" : t("creditCard")}
          </DetailRow>
        ) : null}
      </dl>

      {canShowPix ? (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
          <p className="text-center text-xs font-bold text-emerald-800">{t("pixPayInDrawer")}</p>
          {invoice.pixQrCode ? (
            <div className="flex justify-center rounded-lg bg-[var(--surface-bg)] p-3 ring-1 ring-[var(--border-color)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${invoice.pixQrCode}`}
                alt="PIX"
                className="h-36 w-36"
              />
            </div>
          ) : null}
          {invoice.pixCopyPaste ? (
            <>
              <p className="break-all rounded-lg bg-[var(--surface-bg)] p-2.5 font-mono text-[10px] leading-relaxed text-[var(--text-dim)] ring-1 ring-[var(--border-color)]">
                {invoice.pixCopyPaste}
              </p>
              <button
                type="button"
                onClick={copyPix}
                className={`w-full rounded-lg py-2 text-xs font-bold text-white transition ${
                  copied ? "bg-emerald-600" : "ui-btn-primary"
                }`}
              >
                {copied ? t("pixCopied") : t("pixCopy")}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {pixExpired && (invoice.status === "pending" || invoice.status === "confirmed") ? (
        <div className="ui-alert-warning p-3 text-xs">
          <p className="font-semibold">{t("pixExpiredTitle")}</p>
          <p className="mt-1">{t("pixExpiredBody")}</p>
          <Link href="/billing/plans" className="ui-link mt-2 inline-block">
            {t("generateNewPayment")}
          </Link>
        </div>
      ) : null}

      {invoice.status === "paid" ? (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm text-white">
            ✓
          </span>
          <div>
            <p className="text-xs font-semibold text-emerald-900">{t("invoiceStatusPaid")}</p>
            <p className="text-[11px] text-emerald-700">{t("pixPaidHint")}</p>
          </div>
        </div>
      ) : null}

      {invoice.invoiceUrl ? (
        <a
          href={invoice.invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="ui-btn-primary text-xs"
        >
          {t("openExternalInvoice")}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
