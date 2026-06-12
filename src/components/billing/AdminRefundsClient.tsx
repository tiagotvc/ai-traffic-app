"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AdminBillingNav } from "@/components/billing/AdminBillingNav";

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
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminBillingNav />
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2">{t("colDate")}</th>
            <th className="px-3 py-2">{t("colProvider")}</th>
            <th className="px-3 py-2">{t("colReason")}</th>
            <th className="px-3 py-2">{t("colStatus")}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2">{r.provider}</td>
              <td className="px-3 py-2 max-w-xs truncate">{r.reason}</td>
              <td className="px-3 py-2">{r.status}</td>
              <td className="px-3 py-2">
                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => act(r.id, "approve")} className="text-emerald-600">
                      {t("approve")}
                    </button>
                    <button type="button" onClick={() => act(r.id, "reject")} className="text-red-600">
                      {t("reject")}
                    </button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
