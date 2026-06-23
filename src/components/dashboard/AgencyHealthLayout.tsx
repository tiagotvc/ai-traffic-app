"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type ClientHealthRow = {
  id: string;
  name: string;
  slug: string;
  spend: string;
  roas: string;
  cpl: string;
  trend: string;
  status: "healthy" | "warning";
};

export type HealthMetric = {
  label: string;
  value: string;
  change: string;
  color: string;
};

export function AgencyHealthLayout({
  healthMetrics,
  clients,
  focusMetricColumnLabel,
  isLoading
}: {
  healthMetrics: HealthMetric[];
  clients: ClientHealthRow[];
  focusMetricColumnLabel?: string;
  isLoading?: boolean;
}) {
  const t = useTranslations("dashboard");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border p-4"
              style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
            >
              <div className="skeleton-shimmer mb-3 h-3 w-24 rounded" />
              <div className="skeleton-shimmer mb-2 h-8 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {healthMetrics.map((m, i) => (
          <div
            key={m.label}
            className="kpi-card-hover animate-fade-up cursor-default rounded-xl border p-4"
            style={{
              background: "var(--surface-card)",
              borderColor: "var(--border-color)",
              animationDelay: `${i * 80}ms`,
              animationFillMode: "both"
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: `${m.color}15` }}
              >
                <span className="text-xs font-bold" style={{ color: m.color }}>
                  •
                </span>
              </div>
              <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {m.change}
              </span>
            </div>
            <div
              className="text-xl font-bold"
              style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
            >
              {m.value}
            </div>
            <div className="mt-0.5 text-xs" style={{ color: "var(--text-dim)" }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      <div
        className="animate-fade-up overflow-hidden rounded-xl border"
        style={{
          background: "var(--surface-card)",
          borderColor: "var(--border-color)",
          animationDelay: "320ms",
          animationFillMode: "both"
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-thead)" }}
        >
          <h4 className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            {t("agencyHealthTitle")}
          </h4>
          <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {t("agencyHealthUpdated")}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-thead)" }}>
                {[
                  t("agencyHealthColClient"),
                  t("agencyHealthColSpend"),
                  t("agencyHealthColRoas"),
                  t("agencyHealthColCpl"),
                  focusMetricColumnLabel ?? t("agencyHealthColTrend"),
                  t("agencyHealthColStatus")
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest"
                    style={{ color: "var(--text-dimmer)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="group cursor-pointer border-b transition-colors"
                  style={{ borderColor: "var(--border-color)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--row-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "";
                  }}
                >
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.slug}`} className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: "rgba(79,70,229,0.12)", color: "#7c3aed" }}
                      >
                        {client.name[0]}
                      </div>
                      <span className="text-sm font-medium" style={{ color: "var(--text-main)" }}>
                        {client.name}
                      </span>
                    </Link>
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-semibold"
                    style={{ color: "var(--amber-bright)", fontFamily: "var(--font-heading)" }}
                  >
                    {client.spend}
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-semibold"
                    style={{ color: "var(--success)", fontFamily: "var(--font-heading)" }}
                  >
                    {client.roas}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-main)" }}>
                    {client.cpl}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <StatusBadge status={client.status} />
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

function StatusBadge({ status }: { status: "healthy" | "warning" }) {
  const t = useTranslations("dashboard");
  const isHealthy = status === "healthy";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
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
