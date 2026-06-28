"use client";

import type { ReactNode } from "react";
import { adminPlanTier } from "@/lib/billing/admin-plan-styles";

export const PLAN_BADGE: Record<string, string> = {
  free: "bg-[var(--surface-bg)] text-[var(--text-dim)] ring-slate-200/80",
  basic: "bg-[rgba(124,58,237,0.06)] text-violet-700 ring-violet-200/80",
  advanced: "bg-[rgba(124,58,237,0.1)] text-[var(--violet)] ring-violet-300/60",
  agency: "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-500 ring-amber-300/60"
};

export const STATUS_BADGE: Record<string, { className: string; dot: string }> = {
  active: { className: "bg-emerald-500/15 text-emerald-500 ring-emerald-200/80", dot: "bg-emerald-500" },
  trialing: { className: "bg-blue-500/15 text-blue-500 ring-blue-200/80", dot: "bg-blue-500" },
  past_due: { className: "bg-[rgba(245,166,35,0.12)] text-[var(--amber)] ring-amber-200/80", dot: "bg-amber-500" },
  suspended: { className: "bg-red-500/15 text-red-500 ring-red-200/80", dot: "bg-red-500" },
  canceled: { className: "bg-[var(--surface-bg)] text-[var(--text-dim)] ring-slate-200/80", dot: "bg-slate-400" }
};

export function planBadgeClass(slug: string) {
  return PLAN_BADGE[slug] ?? PLAN_BADGE[adminPlanTier(slug) === "premium" ? "agency" : "basic"];
}

/** Grid da listagem admin — colunas distribuídas na largura total. */
export const ADMIN_USERS_ROW_GRID =
  "grid w-full grid-cols-[minmax(220px,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(96px,auto)] items-center gap-x-6 px-4";

export function userInitials(name: string | null, email: string) {
  const src = (name?.trim() || email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  name,
  email,
  size = "md"
}: {
  name: string | null;
  email: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm"
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 font-bold text-white shadow-sm ring-2 ring-white ${sizes[size]}`}
    >
      {userInitials(name, email)}
    </span>
  );
}

const ICONS = {
  user: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  ),
  email: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  ),
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  ),
  building: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  ),
  tag: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
    />
  ),
  plan: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  ),
  calendar: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  ),
  cycle: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  ),
  search: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  ),
  clients: (
    <path
      strokeLinecap="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
    />
  ),
  ads: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
    />
  ),
  members: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  ),
  automation: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  ),
  ai: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  ),
  reports: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  ),
  note: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  ),
  chevron: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  ),
  save: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 13l4 4L19 7"
    />
  )
} as const;

export type AdminIconKey = keyof typeof ICONS;

export function AdminIcon({ name, className = "h-4 w-4" }: { name: AdminIconKey; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {ICONS[name]}
    </svg>
  );
}

export function AdminSection({
  title,
  subtitle,
  icon,
  accent = "violet",
  children,
  className = ""
}: {
  title: string;
  subtitle?: string;
  icon: AdminIconKey;
  accent?: "violet" | "amber" | "slate" | "emerald";
  children: ReactNode;
  className?: string;
}) {
  const iconTones = {
    violet: "text-[var(--ui-accent)]",
    amber: "text-[var(--amber)]",
    slate: "text-[var(--text-dim)]",
    emerald: "text-emerald-600"
  };

  return (
    <section className={`campaign-creator-card campaign-creator-card--compact ${className}`}>
      <div className="mb-4 flex items-start gap-2.5 border-b border-[var(--creator-card-border)] pb-3">
        <span className="ui-toolbar-icon-shell shrink-0">
          <span className={iconTones[accent]}>
            <AdminIcon name={icon} className="h-4 w-4" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-[var(--text-dim)]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function AdminField({
  label,
  hint,
  icon,
  children
}: {
  label: string;
  hint?: string;
  icon?: AdminIconKey;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="campaign-creator-orion-section-label">{label}</span>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dimmer)]">
            <AdminIcon name={icon} className="h-4 w-4" />
          </span>
        ) : null}
        {children}
      </div>
      {hint ? <p className="text-xs text-[var(--text-dimmer)]">{hint}</p> : null}
    </label>
  );
}

const fieldBase =
  "w-full rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] text-sm text-[var(--text-main)] transition placeholder:text-[var(--text-dimmer)] hover:border-[color-mix(in_srgb,var(--ui-accent)_24%,var(--creator-card-border))] focus:border-[var(--ui-accent)] focus:bg-[var(--creator-card-bg)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ui-accent)_18%,transparent)]";

export function AdminInput({
  icon,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: boolean }) {
  return (
    <input
      className={`${fieldBase} ${icon ? "pl-10 pr-3 py-2.5" : "px-3 py-2.5"} ${className}`}
      {...props}
    />
  );
}

export function AdminSelect({
  icon,
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { icon?: boolean }) {
  return (
    <select
      className={`${fieldBase} appearance-none ${icon ? "pl-10 pr-9 py-2.5" : "px-3 py-2.5"} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function AdminTextarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${fieldBase} min-h-[88px] resize-y px-3 py-2.5 ${className}`}
      {...props}
    />
  );
}

export function AdminSaveButton({
  loading,
  loadingLabel,
  label,
  variant = "violet",
  onClick,
  disabled
}: {
  loading?: boolean;
  loadingLabel: string;
  label: string;
  variant?: "violet" | "amber";
  onClick: () => void;
  disabled?: boolean;
}) {
  const variants = {
    violet: "ui-btn-primary",
    amber: "ui-btn-primary"
  };

  return (
    <button
      type="button"
      disabled={loading || disabled}
      onClick={onClick}
      className={`${variants[variant]} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <AdminIcon name="save" className="h-4 w-4" />
      )}
      {loading ? loadingLabel : label}
    </button>
  );
}

export type AddonKey =
  | "extraClients"
  | "extraAdAccounts"
  | "extraMembers"
  | "extraAutomationRules"
  | "extraAiRequestsPerMonth"
  | "extraScheduledReports";

export const ADDON_META: Record<
  AddonKey,
  { icon: AdminIconKey; color: string; ring: string; gradient: string }
> = {
  extraClients: {
    icon: "clients",
    color: "text-blue-600",
    ring: "ring-blue-100",
    gradient: "from-blue-500/10 to-transparent"
  },
  extraAdAccounts: {
    icon: "ads",
    color: "text-[var(--violet)]",
    ring: "ring-violet-100",
    gradient: "from-violet-500/10 to-transparent"
  },
  extraMembers: {
    icon: "members",
    color: "text-indigo-600",
    ring: "ring-indigo-100",
    gradient: "from-indigo-500/10 to-transparent"
  },
  extraAutomationRules: {
    icon: "automation",
    color: "text-amber-600",
    ring: "ring-amber-100",
    gradient: "from-amber-500/10 to-transparent"
  },
  extraAiRequestsPerMonth: {
    icon: "ai",
    color: "text-pink-600",
    ring: "ring-pink-100",
    gradient: "from-pink-500/10 to-transparent"
  },
  extraScheduledReports: {
    icon: "reports",
    color: "text-emerald-600",
    ring: "ring-emerald-100",
    gradient: "from-emerald-500/10 to-transparent"
  }
};

export function AddonStepperCard({
  label,
  addonKey,
  value,
  baseLimit,
  planLabel = "Plano",
  extraLabel = "extra",
  onChange
}: {
  label: string;
  addonKey: AddonKey;
  value: number;
  baseLimit?: number;
  planLabel?: string;
  extraLabel?: string;
  onChange: (v: number) => void;
}) {
  const meta = ADDON_META[addonKey];
  const effective = (baseLimit ?? 0) + value;

  return (
    <div
      className={`campaign-creator-sidebar-card-inset rounded-xl border p-3 ${meta.gradient}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-card)] shadow-sm ring-1 ${meta.ring} ${meta.color}`}
        >
          <AdminIcon name={meta.icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--text-main)]">{label}</p>
          {baseLimit !== undefined ? (
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">
              {planLabel}: {baseLimit} → <span className="font-semibold text-[var(--text-dim)]">{effective}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] text-base font-medium text-[var(--text-dim)] shadow-sm transition hover:border-slate-300 hover:bg-[var(--surface-thead)]"
          aria-label="-1"
        >
          −
        </button>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-lg font-bold tabular-nums text-[var(--text-main)]">+{value}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
            {extraLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] text-base font-medium text-[var(--text-dim)] shadow-sm transition hover:border-violet-300 hover:bg-[rgba(124,58,237,0.06)] hover:text-violet-700"
          aria-label="+1"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const toneMap: Record<string, "success" | "accent" | "neutral"> = {
    active: "success",
    trialing: "accent",
    past_due: "neutral",
    suspended: "neutral",
    canceled: "neutral"
  };
  const tone = toneMap[status] ?? "neutral";
  return (
    <span className={`ds-table-compact-badge ds-table-compact-badge--${tone}`}>
      {label ?? status}
    </span>
  );
}

export function PlanBadge({ slug, name, label }: { slug: string; name: string; label?: string }) {
  const tone = slug === "agency" ? "accent" : slug === "free" ? "neutral" : "accent";
  return (
    <span className={`ds-table-compact-badge ds-table-compact-badge--${tone}`}>
      {label ?? name}
    </span>
  );
}
