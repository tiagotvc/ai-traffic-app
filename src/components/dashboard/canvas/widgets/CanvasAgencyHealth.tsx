"use client";

import { useTranslations } from "next-intl";

import {
  AgencyHealthLayout,
  type ClientHealthRow,
  type HealthMetric
} from "@/components/dashboard/AgencyHealthLayout";
import type { ClientsHealthView } from "@/lib/dashboard/widget-config";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Agency health widget for canvas — full, cards, or table. */
export function CanvasAgencyHealth({
  healthMetrics,
  clients,
  isLoading,
  view = "full"
}: {
  healthMetrics: HealthMetric[];
  clients: ClientHealthRow[];
  isLoading?: boolean;
  view?: ClientsHealthView;
}) {
  const t = useTranslations("dashboard");

  if (view === "full") {
    return (
      <div className="h-full min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        <AgencyHealthLayout healthMetrics={healthMetrics} clients={clients} isLoading={isLoading} />
      </div>
    );
  }

  if (isLoading) {
    if (view === "cards") {
      return (
        <div className="grid auto-rows-min grid-cols-2 gap-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer h-14 rounded-lg" />
          ))}
        </div>
      );
    }
    return <div className="skeleton-shimmer h-full rounded-lg" />;
  }

  if (view === "cards") {
    return (
      <div className="grid auto-rows-min grid-cols-2 gap-2 md:grid-cols-4">
        {healthMetrics.map((m) => (
          <div
            key={m.label}
            className="flex flex-col justify-center rounded-lg border px-2.5 py-2"
            style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px]" style={{ color: "var(--text-dim)" }}>
                {m.label}
              </span>
              <span className="shrink-0 text-[10px]" style={{ color: m.color }}>
                {m.change}
              </span>
            </div>
            <div
              className="mt-0.5 truncate text-lg font-bold leading-tight"
              style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border" style={{ borderColor: "var(--border-color)" }}>
      <div
        className="flex shrink-0 items-center justify-between border-b px-3 py-2"
        style={{ borderColor: "var(--border-color)", background: "var(--surface-thead)" }}
      >
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
          {t("agencyHealthTitle")}
        </h4>
        <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
          {t("agencyHealthUpdated")}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 z-[1]">
            <tr style={{ background: "var(--surface-thead)" }}>
              {[
                t("agencyHealthColClient"),
                t("agencyHealthColSpend"),
                t("agencyHealthColRoas"),
                t("agencyHealthColCpl"),
                t("agencyHealthColTrend"),
                t("agencyHealthColStatus")
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-[10px] uppercase tracking-wide"
                  style={{ color: "var(--text-dimmer)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b" style={{ borderColor: "var(--border-color)" }}>
                <td className="truncate px-3 py-2.5">
                  <Link
                    href={`/clients/${client.slug}`}
                    className="truncate text-sm font-medium hover:underline"
                    style={{ color: "var(--text-main)" }}
                  >
                    {client.name}
                  </Link>
                </td>
                <td className="truncate px-3 py-2.5 text-sm font-semibold" style={{ color: "var(--amber-bright)" }}>
                  {client.spend}
                </td>
                <td className="truncate px-3 py-2.5 text-sm font-semibold" style={{ color: "var(--success)" }}>
                  {client.roas}
                </td>
                <td className="truncate px-3 py-2.5 text-sm" style={{ color: "var(--text-main)" }}>
                  {client.cpl}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: client.trend.startsWith("+")
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(239,68,68,0.12)",
                      color: client.trend.startsWith("+") ? "var(--success)" : "var(--danger)"
                    }}
                  >
                    {client.trend}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={client.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "healthy" | "warning" }) {
  const t = useTranslations("dashboard");
  const isHealthy = status === "healthy";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: isHealthy ? "rgba(16,185,129,0.12)" : "rgba(245,166,35,0.12)",
        color: isHealthy ? "#10b981" : "#f5a623"
      }}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", !isHealthy && "animate-pulse-amber")}
        style={{ background: isHealthy ? "#10b981" : "#f5a623" }}
      />
      {isHealthy ? t("agencyHealthStatusHealthy") : t("agencyHealthStatusWarning")}
    </span>
  );
}
