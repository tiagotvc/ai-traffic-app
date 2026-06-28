"use client";

import { Receipt, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { DsPageHeader } from "@/design-system";
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
    <div className="campaign-creator-card campaign-creator-card--compact">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h2>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{block.currency}</p>
        </div>
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ui-btn-accent-outline px-2.5 py-1 text-[11px] font-heading font-semibold"
        >
          {t("financeOpenDashboard")}
        </a>
      </div>
      <dl className="grid gap-2.5 sm:grid-cols-2">
        <div className="campaign-creator-sidebar-card-inset rounded-lg border px-3 py-2">
          <dt className="campaign-creator-orion-section-label">{t("financeRevenue")}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-emerald-500">
            {formatMoney(block.revenueCents, block.currency)}
          </dd>
          <dd className="text-[11px] text-[var(--text-dimmer)]">{block.paidInvoiceCount} paid</dd>
        </div>
        <div className="campaign-creator-sidebar-card-inset rounded-lg border px-3 py-2">
          <dt className="campaign-creator-orion-section-label">{t("financeMrr")}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-[var(--text-main)]">
            {formatMoney(block.mrrCents, block.currency)}
          </dd>
          <dd className="text-[11px] text-[var(--text-dimmer)]">
            {block.activeSubscriptions} {t("financeActiveSubs")}
          </dd>
        </div>
        <div className="campaign-creator-sidebar-card-inset rounded-lg border px-3 py-2">
          <dt className="campaign-creator-orion-section-label">{t("financePending")}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-[var(--amber)]">
            {formatMoney(block.pendingCents, block.currency)}
          </dd>
          <dd className="text-[11px] text-[var(--text-dimmer)]">{block.pendingCount}</dd>
        </div>
        <div className="campaign-creator-sidebar-card-inset rounded-lg border px-3 py-2">
          <dt className="campaign-creator-orion-section-label">{t("financeRefunded")}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-[var(--text-dim)]">
            {formatMoney(block.refundedCents, block.currency)}
          </dd>
          <dd className="text-[11px] text-[var(--text-dimmer)]">{block.refundedCount}</dd>
        </div>
        {balance ? (
          <div className="campaign-creator-sidebar-card-inset rounded-lg border px-3 py-2 sm:col-span-2">
            <dt className="campaign-creator-orion-section-label">{t("financeProviderBalance")}</dt>
            <dd className="mt-1 font-semibold text-[var(--text-main)]">{balance}</dd>
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

  if (loading) return <p className="w-full text-sm text-[var(--text-dim)]">{t("loading")}</p>;
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
    <div className="w-full space-y-4">
      <DsPageHeader
        title={t("financeTitle")}
        subtitle={t("financeSubtitle")}
        titleIcon={<Wallet size={16} />}
      />

      <div className="grid gap-3 lg:grid-cols-2">
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

      <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
        <div className="ui-campaign-table-shell__header">
          <div className="ui-campaign-table-shell__title">
            <span className="ui-campaign-table-shell__icon">
              <Receipt size={15} strokeWidth={2} />
            </span>
            <span>{t("financeRecentInvoices")}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="ui-campaign-table ui-campaign-table--compact w-full text-left">
            <thead>
              <tr>
                <th>{t("colDate")}</th>
                <th>{t("colProvider")}</th>
                <th>{t("colAmount")}</th>
                <th>{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{new Date(inv.createdAt).toLocaleDateString(locale)}</td>
                  <td>{inv.provider}</td>
                  <td className="font-semibold tabular-nums">
                    {formatMoney(inv.amountCents, inv.currency ?? "BRL")}
                  </td>
                  <td>
                    <span className="ds-table-compact-badge ds-table-compact-badge--neutral">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
