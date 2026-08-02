"use client";

import { Users2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { DsPageHeader } from "@/design-system";

type SubscriptionRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  customerName: string | null;
  customerEmail: string | null;
  planId: string;
  planName: string;
  planSlug: string;
  status: string;
  provider: string | null;
  billingCycle: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export function AdminSubscriptionsClient() {
  const t = useTranslations("billingAdmin");
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/billing/subscriptions")
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) setError(j.error);
        else setRows(j.subscriptions ?? []);
      })
      .catch(() => setError("Error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function refund(row: SubscriptionRow) {
    const label = row.customerName ?? row.tenantName;
    const confirmed = confirm(
      t("refundConfirm", { name: label, provider: row.provider ?? "—" })
    );
    if (!confirmed) return;

    setRefundingId(row.id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/billing/subscriptions/${row.id}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? "Error");
        return;
      }
      setMessage(t("refundProcessed"));
      load();
    } finally {
      setRefundingId(null);
    }
  }

  return (
    <div className="w-full space-y-4">
      <DsPageHeader
        title={t("subscriptionsTitle")}
        subtitle={t("subscriptionsSubtitle")}
        titleIcon={<Users2 size={16} />}
      />
      {error ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-4 py-3 text-xs text-red-600">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-4 py-3 text-xs text-emerald-600">
          {message}
        </div>
      ) : null}
      <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
        <div className="ui-campaign-table-shell__header">
          <div className="ui-campaign-table-shell__title">
            <span className="ui-campaign-table-shell__icon">
              <Users2 size={15} strokeWidth={2} />
            </span>
            <span>{t("subscriptionsTitle")}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="ui-campaign-table ui-campaign-table--compact w-full text-left">
            <thead>
              <tr>
                <th>{t("colCustomer")}</th>
                <th>{t("colPlan")}</th>
                <th>{t("colProvider")}</th>
                <th>{t("colPeriodEnd")}</th>
                <th>{t("colStatus")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-dimmer)]">
                    {t("loading")}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-dimmer)]">
                    {t("subscriptionsEmpty")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="font-medium text-[var(--text-main)]">
                        {row.customerName ?? row.tenantName}
                      </div>
                      {row.customerEmail ? (
                        <div className="text-[11px] text-[var(--text-dimmer)]">{row.customerEmail}</div>
                      ) : null}
                    </td>
                    <td>{row.planName}</td>
                    <td>{row.provider ?? "—"}</td>
                    <td>
                      {row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <span className="ds-table-compact-badge ds-table-compact-badge--success">
                        {row.status}
                      </span>
                      {row.cancelAtPeriodEnd ? (
                        <span className="ds-table-compact-badge ds-table-compact-badge--neutral ml-1.5">
                          {t("cancelAtPeriodEndBadge")}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={refundingId === row.id}
                        onClick={() => refund(row)}
                        className="ds-table-compact-action ds-table-compact-action--danger disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t("refundAction")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
