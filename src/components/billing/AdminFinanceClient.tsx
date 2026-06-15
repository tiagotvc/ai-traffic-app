"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/billing/pricing";

type ProviderBlock = {
  provider: string;
  currency: string;
  revenueCents: number;
  paidInvoiceCount: number;
  pendingCents: number;
  pendingCount: number;
  refundedCents: number;
  refundedCount: number;
  mrrCents: number;
  activeSubscriptions: number;
};

type InvoiceRow = {
  id: string;
  tenantId: string;
  provider: string;
  amountCents: number;
  currency: string;
  status: string;
  paidAt?: string | null;
  createdAt: string;
};

function ProviderCard({
  title,
  block,
  balance,
  dashboardUrl
}: {
  title: string;
  block: ProviderBlock;
  balance: string | null;
  dashboardUrl: string;
}) {
  const t = useTranslations("billingAdmin");
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-violet-600 hover:underline"
        >
          {t("financeOpenDashboard")}
        </a>
      </div>
      <p className="mt-1 text-xs text-slate-500">{block.currency}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">{t("financeRevenue")}</dt>
          <dd className="text-xl font-bold tabular-nums text-emerald-700">
            {formatMoney(block.revenueCents, block.currency)}
          </dd>
          <dd className="text-xs text-slate-400">{block.paidInvoiceCount} paid</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t("financeMrr")}</dt>
          <dd className="text-xl font-bold tabular-nums text-slate-900">
            {formatMoney(block.mrrCents, block.currency)}
          </dd>
          <dd className="text-xs text-slate-400">
            {block.activeSubscriptions} {t("financeActiveSubs")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t("financePending")}</dt>
          <dd className="font-semibold tabular-nums text-amber-700">
            {formatMoney(block.pendingCents, block.currency)}
          </dd>
          <dd className="text-xs text-slate-400">{block.pendingCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">{t("financeRefunded")}</dt>
          <dd className="font-semibold tabular-nums text-slate-700">
            {formatMoney(block.refundedCents, block.currency)}
          </dd>
          <dd className="text-xs text-slate-400">{block.refundedCount}</dd>
        </div>
        {balance ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">{t("financeProviderBalance")}</dt>
            <dd className="font-semibold text-slate-900">{balance}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function AdminFinanceClient() {
  const t = useTranslations("billingAdmin");
  const locale = useLocale();
  const [summary, setSummary] = useState<{
    providers: { asaas: ProviderBlock; stripe: ProviderBlock };
  } | null>(null);
  const [balances, setBalances] = useState<{
    asaas: { availableCents: number; currency: string } | null;
    stripe: { available: Array<{ amountCents: number; currency: string }> } | null;
  } | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/billing/finance/summary").then((r) => r.json()),
      fetch("/api/admin/billing/finance/balances").then((r) => r.json()),
      fetch("/api/admin/billing/finance/invoices?limit=30").then((r) => r.json())
    ])
      .then(([sumJ, balJ, invJ]) => {
        if (!sumJ.ok) throw new Error(sumJ.error ?? "Summary failed");
        setSummary(sumJ);
        if (balJ.ok) setBalances({ asaas: balJ.asaas, stripe: balJ.stripe });
        if (invJ.ok) setInvoices(invJ.invoices ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) return <p className="w-full text-sm text-slate-500">{t("loading")}</p>;
  if (error) return <p className="w-full text-sm text-red-600">{error}</p>;
  if (!summary) return null;

  const stripeBal = balances?.stripe?.available?.[0];
  const stripeBalanceStr = stripeBal
    ? formatMoney(stripeBal.amountCents, stripeBal.currency)
    : null;
  const asaasBalanceStr = balances?.asaas
    ? formatMoney(balances.asaas.availableCents, balances.asaas.currency)
    : null;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("financeTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("financeSubtitle")}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ProviderCard
          title={t("financeAsaas")}
          block={summary.providers.asaas}
          balance={asaasBalanceStr}
          dashboardUrl="https://www.asaas.com"
        />
        <ProviderCard
          title={t("financeStripe")}
          block={summary.providers.stripe}
          balance={stripeBalanceStr}
          dashboardUrl="https://dashboard.stripe.com"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 font-semibold text-slate-900">
          {t("financeRecentInvoices")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("colDate")}</th>
                <th className="px-5 py-3">{t("colProvider")}</th>
                <th className="px-5 py-3">{t("colAmount")}</th>
                <th className="px-5 py-3">{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-5 py-3">
                    {new Date(inv.createdAt).toLocaleDateString(locale)}
                  </td>
                  <td className="px-5 py-3">{inv.provider}</td>
                  <td className="px-5 py-3 font-semibold tabular-nums">
                    {formatMoney(inv.amountCents, inv.currency ?? "BRL")}
                  </td>
                  <td className="px-5 py-3">{inv.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
