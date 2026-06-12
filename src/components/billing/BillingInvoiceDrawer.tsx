"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BillingDrawerSkeleton } from "@/components/billing/BillingSkeletons";
import {
  BillingDrawerShell,
  formatBillingAmountParts,
  InvoiceStatusBadge
} from "@/components/billing/billing-ui";
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
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

export function BillingInvoiceDrawer({
  invoiceId,
  open,
  onClose,
  onUpdated
}: {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const t = useTranslations("billingPage");
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceId}`);
      const j = await res.json();
      if (j.invoice) {
        setInvoice(j.invoice as InvoiceDetail);
        if (j.invoice.status === "paid") onUpdated?.();
      }
    } finally {
      setLoading(false);
    }
  }, [invoiceId, onUpdated]);

  useEffect(() => {
    if (open && invoiceId) {
      setInvoice(null);
      load();
    }
  }, [open, invoiceId, load]);

  useEffect(() => {
    if (!open || !invoiceId) return;
    if (invoice?.status === "paid" || invoice?.status === "canceled") return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [open, invoiceId, invoice?.status, load]);

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

  const headerExtra =
    invoice && !loading ? (
      (() => {
        const { symbol, amount } = formatBillingAmountParts(invoice.amountCents, invoice.provider);
        return (
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-1">
              <span className="pb-1 text-xl font-bold text-violet-200">{symbol}</span>
              <span className="text-4xl font-extrabold leading-none tracking-tight">{amount}</span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <InvoiceStatusBadge status={invoice.status} />
              {invoice.billingCycle ? (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-100">
                  {invoice.billingCycle === "yearly" ? t("yearly") : t("monthly")}
                </span>
              ) : null}
            </div>
          </div>
        );
      })()
    ) : null;

  return (
    <BillingDrawerShell
      open={open}
      onClose={onClose}
      title={t("invoiceDetail")}
      subtitle={invoice?.description ?? undefined}
      headerExtra={headerExtra}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {t("close")}
          </button>
          {invoice?.invoiceUrl ? (
            <a
              href={invoice.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              {t("openExternalInvoice")}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : null}
        </div>
      }
    >
      {loading && !invoice ? (
        <BillingDrawerSkeleton />
      ) : !invoice ? (
        <p className="text-sm text-slate-500">{t("invoiceNotFound")}</p>
      ) : (
        <div className="space-y-3">
          <dl className="space-y-2">
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
            <div className="mt-4 space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <p className="text-center text-sm font-bold text-emerald-800">{t("pixPayInDrawer")}</p>
              {invoice.pixQrCode ? (
                <div className="flex justify-center rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${invoice.pixQrCode}`}
                    alt="PIX"
                    className="h-48 w-48"
                  />
                </div>
              ) : null}
              {invoice.pixCopyPaste ? (
                <>
                  <p className="break-all rounded-lg bg-slate-50 p-3 font-mono text-[10px] leading-relaxed text-slate-600 ring-1 ring-slate-100">
                    {invoice.pixCopyPaste}
                  </p>
                  <button
                    type="button"
                    onClick={copyPix}
                    className={`w-full rounded-xl py-3 text-sm font-bold text-white transition ${
                      copied ? "bg-emerald-600" : "bg-violet-600 hover:bg-violet-700"
                    }`}
                  >
                    {copied ? t("pixCopied") : t("pixCopy")}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {pixExpired && (invoice.status === "pending" || invoice.status === "confirmed") ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">{t("pixExpiredTitle")}</p>
              <p className="mt-1 text-amber-800">{t("pixExpiredBody")}</p>
              <Link href="/billing/plans" className="mt-3 inline-block font-semibold text-violet-700 underline">
                {t("generateNewPayment")}
              </Link>
            </div>
          ) : null}

          {invoice.status === "paid" ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                ✓
              </span>
              <div>
                <p className="font-semibold text-emerald-900">{t("invoiceStatusPaid")}</p>
                <p className="text-xs text-emerald-700">{t("pixPaidHint")}</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </BillingDrawerShell>
  );
}
