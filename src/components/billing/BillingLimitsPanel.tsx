"use client";

import { useTranslations } from "next-intl";
import type { PlanLimits, TenantUsage } from "@/lib/billing/types";

type LimitRow = {
  key: string;
  label: string;
  usage?: number;
  max?: number;
  enabled?: boolean;
  icon: React.ReactNode;
  color: string;
};

function UsageBar({ usage, max }: { usage: number; max: number }) {
  if (max <= 0) return null;
  const pct = Math.min(100, Math.round((usage / max) * 100));
  const bar =
    usage > max ? "bg-red-500" : pct >= 85 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function IconClients() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconAds() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  );
}

function IconMembers() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconSync() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function IconLive() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  );
}

/** Limites com ícones — versão checkout/planos (sem uso atual). */
export function PlanLimitsGrid({ limits }: { limits: PlanLimits }) {
  const t = useTranslations("billingPage");

  const rows: LimitRow[] = [
    {
      key: "clients",
      label: t("limitClients"),
      max: limits.maxClients,
      icon: <IconClients />,
      color: "bg-blue-100 text-blue-600"
    },
    {
      key: "ads",
      label: t("limitAdAccounts"),
      max: limits.maxAdAccounts,
      icon: <IconAds />,
      color: "bg-violet-100 text-violet-600"
    },
    {
      key: "members",
      label: t("limitMembers"),
      max: limits.maxMembers,
      icon: <IconMembers />,
      color: "bg-indigo-100 text-indigo-600"
    },
    {
      key: "auto",
      label: t("limitAutomations"),
      max: limits.maxAutomationRules,
      icon: <IconBolt />,
      color: "bg-amber-100 text-amber-600"
    },
    {
      key: "ai",
      label: t("limitAi"),
      max: limits.maxAiRequestsPerMonth,
      icon: <IconSpark />,
      color: "bg-pink-100 text-pink-600"
    },
    {
      key: "reports",
      label: t("limitReports"),
      max: limits.maxScheduledReports,
      icon: <IconReport />,
      color: "bg-cyan-100 text-cyan-600"
    }
  ];

  const flags: LimitRow[] = [
    {
      key: "sync",
      label: t("limitAutoSync"),
      enabled: limits.allowAutoSync,
      icon: <IconSync />,
      color: limits.allowAutoSync ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
    },
    {
      key: "live",
      label: t("limitLiveMeta"),
      enabled: limits.allowLiveMeta,
      icon: <IconLive />,
      color: limits.allowLiveMeta ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-400"
    }
  ];

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 px-3 py-2.5"
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${row.color}`}>
            {row.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-600">{row.label}</p>
            <p className="text-base font-bold text-slate-900">{row.max}</p>
          </div>
        </div>
      ))}
      {flags.map((row) => (
        <div
          key={row.key}
          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
            row.enabled ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${row.color}`}>
            {row.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-600">{row.label}</p>
            <p className={`text-xs font-bold ${row.enabled ? "text-emerald-700" : "text-slate-400"}`}>
              {row.enabled ? t("included") : t("notIncluded")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BillingLimitsPanel({
  limits,
  usage
}: {
  limits: PlanLimits;
  usage: TenantUsage;
}) {
  const t = useTranslations("billingPage");

  const rows: LimitRow[] = [
    {
      key: "clients",
      label: t("limitClients"),
      usage: usage.clients,
      max: limits.maxClients,
      icon: <IconClients />,
      color: "bg-blue-100 text-blue-600"
    },
    {
      key: "ads",
      label: t("limitAdAccounts"),
      usage: usage.adAccounts,
      max: limits.maxAdAccounts,
      icon: <IconAds />,
      color: "bg-violet-100 text-violet-600"
    },
    {
      key: "members",
      label: t("limitMembers"),
      usage: usage.members,
      max: limits.maxMembers,
      icon: <IconMembers />,
      color: "bg-indigo-100 text-indigo-600"
    },
    {
      key: "auto",
      label: t("limitAutomations"),
      usage: usage.automationRules,
      max: limits.maxAutomationRules,
      icon: <IconBolt />,
      color: "bg-amber-100 text-amber-600"
    },
    {
      key: "ai",
      label: t("limitAi"),
      usage: usage.aiRequestsThisMonth,
      max: limits.maxAiRequestsPerMonth,
      icon: <IconSpark />,
      color: "bg-pink-100 text-pink-600"
    },
    {
      key: "reports",
      label: t("limitReports"),
      usage: usage.scheduledReports,
      max: limits.maxScheduledReports,
      icon: <IconReport />,
      color: "bg-cyan-100 text-cyan-600"
    }
  ];

  const flags: LimitRow[] = [
    {
      key: "sync",
      label: t("limitAutoSync"),
      enabled: limits.allowAutoSync,
      icon: <IconSync />,
      color: limits.allowAutoSync ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
    },
    {
      key: "live",
      label: t("limitLiveMeta"),
      enabled: limits.allowLiveMeta,
      icon: <IconLive />,
      color: limits.allowLiveMeta ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-400"
    }
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div
          key={row.key}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${row.color}`}>
              {row.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-slate-500">{row.label}</p>
              {row.max != null && row.usage != null ? (
                <p
                  className={`text-lg font-semibold leading-tight tabular-nums ${
                    row.usage > row.max ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {row.usage}
                  <span className="text-xs font-normal text-slate-400"> / {row.max}</span>
                </p>
              ) : null}
            </div>
          </div>
          {row.max != null && row.usage != null ? (
            <UsageBar usage={row.usage} max={row.max} />
          ) : null}
        </div>
      ))}
      {flags.map((row) => (
        <div
          key={row.key}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 shadow-sm ${
            row.enabled ? "border-emerald-100 bg-emerald-50/50" : "border-slate-200 bg-slate-50/80"
          }`}
        >
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${row.color}`}>
            {row.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-slate-500">{row.label}</p>
            <p className={`text-xs font-semibold ${row.enabled ? "text-emerald-700" : "text-slate-400"}`}>
              {row.enabled ? t("included") : t("notIncluded")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
