"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { DsPageHeader } from "@/design-system";

type RefundRow = {
  id: string;
  tenantId: string;
  invoiceId: string;
  reason?: string | null;
  status: string;
  provider: string;
  createdAt: string;
};

export function AdminRefundsClient() {
  const t = useTranslations("billingAdmin");
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/billing/refunds")
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) setError(j.error);
        else setRows(j.refunds ?? []);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/billing/refunds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action })
    });
    const j = await res.json();
    if (!j.ok) setError(j.error);
    else load();
  }

  return (
    <div className="w-full space-y-4">
      <DsPageHeader
        title={t("title")}
        subtitle={t("refundsSubtitle")}
        titleIcon={<RotateCcw size={16} />}
      />
      {error ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-4 py-3 text-xs text-red-600">
          {error}
        </div>
      ) : null}
      <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
        <div className="ui-campaign-table-shell__header">
          <div className="ui-campaign-table-shell__title">
            <span className="ui-campaign-table-shell__icon">
              <RotateCcw size={15} strokeWidth={2} />
            </span>
            <span>{t("title")}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="ui-campaign-table ui-campaign-table--compact w-full text-left">
            <thead>
              <tr>
                <th>{t("colDate")}</th>
                <th>{t("colProvider")}</th>
                <th>{t("colReason")}</th>
                <th>{t("colStatus")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--text-dimmer)]">
                    {t("loading")}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.provider}</td>
                    <td className="max-w-xs truncate">{r.reason}</td>
                    <td>
                      <span
                        className={`ds-table-compact-badge ${
                          r.status === "pending"
                            ? "ds-table-compact-badge--accent"
                            : "ds-table-compact-badge--neutral"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => act(r.id, "approve")}
                            className="ds-table-compact-action text-emerald-600"
                          >
                            {t("approve")}
                          </button>
                          <button
                            type="button"
                            onClick={() => act(r.id, "reject")}
                            className="ds-table-compact-action ds-table-compact-action--danger"
                          >
                            {t("reject")}
                          </button>
                        </div>
                      ) : null}
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
