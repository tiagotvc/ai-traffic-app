"use client";

import { useTranslations } from "next-intl";
import type { PlanLimits, TenantUsage } from "@/lib/billing/types";

type LimitTone = {
  iconClass: string;
  barColor: string;
};

type LimitRow = {
  key: string;
  label: string;
  usage?: number;
  max?: number;
  enabled?: boolean;
  icon: React.ReactNode;
  tone: LimitTone;
};

function UsageBar({ usage, max, barColor }: { usage: number; max: number; barColor: string }) {
  if (max <= 0) return null;
  const pct = Math.min(100, Math.round((usage / max) * 100));
  const displayPct = usage > 0 ? Math.max(3, pct) : 0;
  return (
    <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${displayPct}%`, background: barColor }}
      />
    </div>
  );
}

function LimitItem({
  label,
  icon,
  tone,
  value,
  usage,
  max
}: {
  label: string;
  icon: React.ReactNode;
  tone: LimitTone;
  value: React.ReactNode;
  usage?: number;
  max?: number;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.iconClass}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-[var(--text-dim)]">{label}</p>
          <div className="mt-0.5 tabular-nums leading-tight">{value}</div>
        </div>
      </div>
      {usage != null && max != null ? <UsageBar usage={usage} max={max} barColor={tone.barColor} /> : null}
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

const LIMIT_TONES = {
  accent: {
    iconClass: "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]",
    barColor: "var(--ui-accent)"
  },
  amber: {
    iconClass: "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]",
    barColor: "var(--ui-accent)"
  },
  pink: {
    iconClass: "bg-pink-500/15 text-pink-400",
    barColor: "#f472b6"
  },
  sky: {
    iconClass: "bg-sky-500/15 text-sky-400",
    barColor: "#38bdf8"
  },
  emerald: {
    iconClass: "bg-emerald-500/15 text-emerald-400",
    barColor: "#34d399"
  },
  orange: {
    iconClass: "bg-orange-500/15 text-orange-400",
    barColor: "#fb923c"
  },
  muted: {
    iconClass: "bg-[var(--surface-thead)] text-[var(--text-dimmer)]",
    barColor: "var(--text-dimmer)"
  }
} as const satisfies Record<string, LimitTone>;

function UsageValue({ usage, max }: { usage: number; max: number }) {
  const over = usage > max;
  return (
    <p className={`text-sm font-semibold ${over ? "text-red-400" : "text-[var(--text-main)]"}`}>
      {usage}
      <span className="font-normal text-[var(--text-dimmer)]"> / {max}</span>
    </p>
  );
}

/** Limites com ícones — versão checkout/planos (sem uso atual). */
export function PlanLimitsGrid({ limits }: { limits: PlanLimits }) {
  const t = useTranslations("billingPage");

  const rows: LimitRow[] = [
    { key: "clients", label: t("limitClients"), max: limits.maxClients, icon: <IconClients />, tone: LIMIT_TONES.accent },
    { key: "ads", label: t("limitAdAccounts"), max: limits.maxAdAccounts, icon: <IconAds />, tone: LIMIT_TONES.amber },
    { key: "members", label: t("limitMembers"), max: limits.maxMembers, icon: <IconMembers />, tone: LIMIT_TONES.accent },
    { key: "auto", label: t("limitAutomations"), max: limits.maxAutomationRules, icon: <IconBolt />, tone: LIMIT_TONES.amber },
    { key: "ai", label: t("limitAi"), max: limits.maxAiRequestsPerMonth, icon: <IconSpark />, tone: LIMIT_TONES.pink },
    { key: "reports", label: t("limitReports"), max: limits.maxScheduledReports, icon: <IconReport />, tone: LIMIT_TONES.sky }
  ];

  const flags: LimitRow[] = [
    {
      key: "sync",
      label: t("limitAutoSync"),
      enabled: limits.allowAutoSync,
      icon: <IconSync />,
      tone: limits.allowAutoSync ? LIMIT_TONES.emerald : LIMIT_TONES.muted
    },
    {
      key: "live",
      label: t("limitLiveMeta"),
      enabled: limits.allowLiveMeta,
      icon: <IconLive />,
      tone: limits.allowLiveMeta ? LIMIT_TONES.orange : LIMIT_TONES.muted
    }
  ];

  return (
    <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <LimitItem
          key={row.key}
          label={row.label}
          icon={row.icon}
          tone={row.tone}
          value={<p className="text-sm font-semibold text-[var(--text-main)]">{row.max}</p>}
        />
      ))}
      {flags.map((row) => (
        <LimitItem
          key={row.key}
          label={row.label}
          icon={row.icon}
          tone={row.tone}
          value={
            <p className={`text-sm font-medium ${row.enabled ? "text-emerald-400" : "text-[var(--text-dimmer)]"}`}>
              {row.enabled ? t("included") : t("notIncluded")}
            </p>
          }
        />
      ))}
    </div>
  );
}

export function BillingLimitsPanel({
  limits,
  usage,
  compact = false
}: {
  limits: PlanLimits;
  usage: TenantUsage;
  compact?: boolean;
}) {
  const t = useTranslations("billingPage");

  const rows: LimitRow[] = [
    {
      key: "clients",
      label: t("limitClients"),
      usage: usage.clients,
      max: limits.maxClients,
      icon: <IconClients />,
      tone: LIMIT_TONES.accent
    },
    {
      key: "ads",
      label: t("limitAdAccounts"),
      usage: usage.adAccounts,
      max: limits.maxAdAccounts,
      icon: <IconAds />,
      tone: LIMIT_TONES.amber
    },
    {
      key: "members",
      label: t("limitMembers"),
      usage: usage.members,
      max: limits.maxMembers,
      icon: <IconMembers />,
      tone: LIMIT_TONES.accent
    },
    {
      key: "auto",
      label: t("limitAutomations"),
      usage: usage.automationRules,
      max: limits.maxAutomationRules,
      icon: <IconBolt />,
      tone: LIMIT_TONES.amber
    },
    {
      key: "ai",
      label: t("limitAi"),
      usage: usage.aiRequestsThisMonth,
      max: limits.maxAiRequestsPerMonth,
      icon: <IconSpark />,
      tone: LIMIT_TONES.pink
    },
    {
      key: "reports",
      label: t("limitReports"),
      usage: usage.scheduledReports,
      max: limits.maxScheduledReports,
      icon: <IconReport />,
      tone: LIMIT_TONES.sky
    }
  ];

  const flags: LimitRow[] = [
    {
      key: "sync",
      label: t("limitAutoSync"),
      enabled: limits.allowAutoSync,
      icon: <IconSync />,
      tone: limits.allowAutoSync ? LIMIT_TONES.emerald : LIMIT_TONES.muted
    },
    {
      key: "live",
      label: t("limitLiveMeta"),
      enabled: limits.allowLiveMeta,
      icon: <IconLive />,
      tone: limits.allowLiveMeta ? LIMIT_TONES.orange : LIMIT_TONES.muted
    }
  ];

  return (
    <div
      className={
        compact
          ? "grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"
          : "grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {rows.map((row) => (
        <LimitItem
          key={row.key}
          label={row.label}
          icon={row.icon}
          tone={row.tone}
          usage={row.usage}
          max={row.max}
          value={
            row.usage != null && row.max != null ? (
              <UsageValue usage={row.usage} max={row.max} />
            ) : null
          }
        />
      ))}
      {flags.map((row) => (
        <LimitItem
          key={row.key}
          label={row.label}
          icon={row.icon}
          tone={row.tone}
          value={
            <p className={`text-sm font-medium ${row.enabled ? "text-emerald-400" : "text-[var(--text-dimmer)]"}`}>
              {row.enabled ? t("included") : t("notIncluded")}
            </p>
          }
        />
      ))}
    </div>
  );
}
