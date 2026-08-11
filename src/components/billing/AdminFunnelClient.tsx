"use client";

import { Filter } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { DsPageHeader } from "@/design-system";

type RecentRow = {
  visitorId: string;
  email: string | null;
  planSlug: string | null;
  startedAt: string;
  completed: boolean;
};

type FunnelSummary = {
  viewedPricing: number;
  startedCheckout: number;
  completedCheckout: number;
  abandoned: number;
  conversionRate: number;
  recent: RecentRow[];
};

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="campaign-creator-card campaign-creator-card--compact px-4 py-3">
      <div className="font-heading text-2xl font-bold text-[var(--text-main)]">{value}</div>
      <div className="mt-1 font-body text-[11px] text-[var(--text-dimmer)]">{label}</div>
    </div>
  );
}

export function AdminFunnelClient() {
  const t = useTranslations("billingAdmin");
  const [summary, setSummary] = useState<FunnelSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/billing/funnel")
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) setError(j.error ?? "Error");
        else setSummary(j);
      })
      .catch(() => setError("Error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full space-y-4">
      <DsPageHeader title={t("funnelTitle")} subtitle={t("funnelSubtitle")} titleIcon={<Filter size={16} />} />

      {error ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-4 py-3 text-xs text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-4 py-3 text-xs text-[var(--text-dimmer)]">
          {t("loading")}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label={t("funnelViewed")} value={summary.viewedPricing} />
            <StatTile label={t("funnelStarted")} value={summary.startedCheckout} />
            <StatTile label={t("funnelCompleted")} value={summary.completedCheckout} />
            <StatTile label={t("funnelAbandoned")} value={summary.abandoned} />
          </div>
          <div className="campaign-creator-card campaign-creator-card--compact px-4 py-3">
            <span className="font-body text-xs text-[var(--text-dim)]">{t("funnelConversionRate")}: </span>
            <span className="font-heading text-sm font-bold text-[var(--text-main)]">
              {summary.conversionRate}%
            </span>
          </div>

          <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
            <div className="ui-campaign-table-shell__header">
              <div className="ui-campaign-table-shell__title">
                <span className="ui-campaign-table-shell__icon">
                  <Filter size={15} strokeWidth={2} />
                </span>
                <span>{t("funnelRecentTitle")}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="ui-campaign-table ui-campaign-table--compact w-full text-left">
                <thead>
                  <tr>
                    <th>{t("colPlan")}</th>
                    <th>E-mail</th>
                    <th>{t("colStartedAt")}</th>
                    <th>{t("colCompleted")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[var(--text-dimmer)]">
                        {t("funnelEmpty")}
                      </td>
                    </tr>
                  ) : (
                    summary.recent.map((row) => (
                      <tr key={`${row.visitorId}-${row.startedAt}`}>
                        <td>{row.planSlug ?? "—"}</td>
                        <td>{row.email ?? "—"}</td>
                        <td>{new Date(row.startedAt).toLocaleString("pt-BR")}</td>
                        <td>
                          <span
                            className={
                              row.completed
                                ? "ds-table-compact-badge ds-table-compact-badge--success"
                                : "ds-table-compact-badge ds-table-compact-badge--neutral"
                            }
                          >
                            {row.completed ? t("funnelCompletedYes") : t("funnelCompletedNo")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
