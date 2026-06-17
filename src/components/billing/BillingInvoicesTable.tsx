"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { BillingInvoiceDetailPanel } from "@/components/billing/BillingInvoiceDetailPanel";
import {
  formatBillingAmountParts,
  InvoiceStatusBadge,
  NfStatusBadge
} from "@/components/billing/billing-ui";
import { isDueDateValid } from "@/lib/billing/dates";

export type InvoiceListRow = {
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

export function BillingInvoicesTable({
  invoices,
  expandedId,
  onToggle,
  onRequestRefund,
  onUpdated
}: {
  invoices: InvoiceListRow[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onRequestRefund: (id: string) => void;
  onUpdated?: () => void;
}) {
  const t = useTranslations("billingPage");

  return (
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
            const isOpen = expandedId === inv.id;

            return (
              <Fragment key={inv.id}>
                <tr
                  className={`transition ${isOpen ? "bg-violet-50/60" : "hover:bg-violet-50/40"}`}
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">
                      {new Date(inv.createdAt).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </p>
                    {inv.dueDate && isDueDateValid(inv.dueDate, inv.createdAt) ? (
                      <p className="mt-0.5 text-[11px] text-slate-400">
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
                      onClick={() => onToggle(inv.id)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                        isOpen
                          ? "border-violet-300 bg-violet-100 text-violet-800"
                          : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      }`}
                    >
                      <svg
                        className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      {isOpen ? t("hideDetails") : t("details")}
                    </button>
                    {inv.status === "paid" ? (
                      <button
                        type="button"
                        className="ml-2 text-[11px] text-slate-400 underline hover:text-slate-600"
                        onClick={() => onRequestRefund(inv.id)}
                      >
                        {t("requestRefund")}
                      </button>
                    ) : null}
                  </td>
                </tr>
                {isOpen ? (
                  <tr>
                    <td colSpan={5} className="border-t border-violet-100 bg-violet-50/30 p-0">
                      <BillingInvoiceDetailPanel
                        invoiceId={inv.id}
                        onUpdated={onUpdated}
                        compact
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
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
  );
}
