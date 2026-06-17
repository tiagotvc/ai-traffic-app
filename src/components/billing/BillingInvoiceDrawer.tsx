"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { BillingDrawerSkeleton } from "@/components/billing/BillingSkeletons";
import {
  BillingDrawerShell,
  formatBillingAmountParts,
  InvoiceStatusBadge
} from "@/components/billing/billing-ui";
import {
  BillingInvoiceDetailPanel,
  type InvoiceDetail
} from "@/components/billing/BillingInvoiceDetailPanel";

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
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          {t("close")}
        </button>
      }
    >
      {loading && !invoice ? (
        <BillingDrawerSkeleton />
      ) : !invoiceId ? null : (
        <BillingInvoiceDetailPanel invoiceId={invoiceId} onUpdated={onUpdated} />
      )}
    </BillingDrawerShell>
  );
}
