"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Calendar, ChevronDown } from "lucide-react";
import { BillingInvoiceDetailPanel } from "@/components/billing/BillingInvoiceDetailPanel";
import {
  formatBillingAmountParts,
  InvoiceStatusBadge,
  NfStatusBadge
} from "@/components/billing/billing-ui";
import { isDueDateValid } from "@/lib/billing/dates";
import { cn } from "@/lib/cn";

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
      <table className="w-full min-w-[640px] text-left">
        <thead className="border-b border-[var(--border-color)] text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
          <tr>
            <th className="pb-3 pr-4">
              <span className="inline-flex items-center gap-1">
                {t("colDate")}
                <ChevronDown size={12} className="opacity-60" aria-hidden />
              </span>
            </th>
            <th className="px-4 pb-3 text-center">{t("colAmount")}</th>
            <th className="px-4 pb-3">{t("colStatus")}</th>
            <th className="px-4 pb-3">{t("colNf")}</th>
            <th className="pb-3 pl-4" />
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const { symbol, amount } = formatBillingAmountParts(inv.amountCents, inv.provider);
            const isPending = inv.status === "pending" || inv.status === "confirmed";
            const isPaid = inv.status === "paid";
            const isOpen = expandedId === inv.id;

            return (
              <Fragment key={inv.id}>
                <tr
                  className={cn(
                    "transition",
                    isOpen ? "bg-[var(--ui-accent-hover)]" : "hover:bg-[var(--row-hover)]"
                  )}
                >
                  <td className="py-5 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: "var(--ui-accent-muted)",
                          boxShadow: "0 0 20px var(--ui-accent-glow)"
                        }}
                      >
                        <Calendar size={18} className="text-[var(--ui-accent)]" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-main)]">
                          {new Date(inv.createdAt).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </p>
                        {inv.dueDate && isDueDateValid(inv.dueDate, inv.createdAt) ? (
                          <p className="mt-0.5 text-[11px] text-[var(--text-dimmer)]">
                            {t("dueDate")}:{" "}
                            {new Date(inv.dueDate + "T12:00:00").toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        isPaid
                          ? "text-emerald-500"
                          : isPending
                            ? "text-[var(--ui-accent)]"
                            : "text-[var(--text-dim)]"
                      )}
                    >
                      {symbol}
                      {amount}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <InvoiceStatusBadge status={inv.status} variant="outline" />
                  </td>
                  <td className="px-4 py-5">
                    <NfStatusBadge status={inv.nfStatus} pdfUrl={inv.nfPdfUrl} variant="outline" />
                  </td>
                  <td className="py-5 pl-4 text-right">
                    <button
                      type="button"
                      onClick={() => onToggle(inv.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition",
                        isOpen
                          ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                          : "border-[var(--ui-accent-border)] bg-transparent text-[var(--ui-accent)] hover:bg-[var(--ui-accent-hover)]"
                      )}
                    >
                      <ChevronDown
                        size={14}
                        className={cn("transition", isOpen && "rotate-180")}
                        strokeWidth={2.5}
                      />
                      {isOpen ? t("hideDetails") : t("details")}
                    </button>
                    {inv.status === "paid" ? (
                      <button
                        type="button"
                        className="ml-2 text-[11px] text-[var(--text-dimmer)] underline hover:text-[var(--text-dim)]"
                        onClick={() => onRequestRefund(inv.id)}
                      >
                        {t("requestRefund")}
                      </button>
                    ) : null}
                  </td>
                </tr>
                {isOpen ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border-t border-[var(--ui-accent-border)] bg-[var(--ui-accent-hover)] p-0"
                    >
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
              <td colSpan={5} className="px-4 py-12 text-center text-sm text-[var(--text-dim)]">
                {t("noInvoices")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
