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

type SourceRow = {
  source: string;
  campaign: string;
  content: string;
  viewedLanding: number;
  clickedCta: number;
  startedSignup: number;
  completedSignup: number;
};

type FunnelSummary = {
  viewedPricing: number;
  startedCheckout: number;
  completedCheckout: number;
  abandoned: number;
  conversionRate: number;
  recent: RecentRow[];
  acquisition: {
    viewedLanding: number;
    clickedCta: number;
    startedSignup: number;
    completedSignup: number;
    startedTrial: number;
  };
  bySource: SourceRow[];
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
          {/* Aquisição vem primeiro: é o funil que decide onde a verba de anúncio para. */}
          <div>
            <div className="font-heading text-sm font-bold text-[var(--text-main)]">
              {t("acquisitionTitle")}
            </div>
            <p className="mt-0.5 font-body text-[11px] text-[var(--text-dimmer)]">
              {t("acquisitionSubtitle")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile label={t("acqViewedLanding")} value={summary.acquisition.viewedLanding} />
            <StatTile label={t("acqClickedCta")} value={summary.acquisition.clickedCta} />
            <StatTile label={t("acqStartedSignup")} value={summary.acquisition.startedSignup} />
            <StatTile label={t("acqCompletedSignup")} value={summary.acquisition.completedSignup} />
            <StatTile label={t("acqStartedTrial")} value={summary.acquisition.startedTrial} />
          </div>

          <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
            <div className="ui-campaign-table-shell__header">
              <div className="ui-campaign-table-shell__title">
                <span className="ui-campaign-table-shell__icon">
                  <Filter size={15} strokeWidth={2} />
                </span>
                <span>{t("sourceTitle")}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="ui-campaign-table ui-campaign-table--compact w-full text-left">
                <thead>
                  <tr>
                    <th>{t("colSource")}</th>
                    <th>{t("colCampaign")}</th>
                    <th>{t("colContent")}</th>
                    <th>{t("acqViewedLanding")}</th>
                    <th>{t("acqClickedCta")}</th>
                    <th>{t("acqStartedSignup")}</th>
                    <th>{t("acqCompletedSignup")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.bySource.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--text-dimmer)]">
                        {t("sourceEmpty")}
                      </td>
                    </tr>
                  ) : (
                    summary.bySource.map((row) => (
                      <tr key={`${row.source}-${row.campaign}-${row.content}`}>
                        <td>{row.source}</td>
                        <td>{row.campaign}</td>
                        <td>{row.content}</td>
                        <td>{row.viewedLanding}</td>
                        <td>{row.clickedCta}</td>
                        <td>{row.startedSignup}</td>
                        <td>{row.completedSignup}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
