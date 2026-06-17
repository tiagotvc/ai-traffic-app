"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { AgencyBrainNavGroup } from "@/components/layout/AgencyBrainNavGroup";
import type { AgencyBrainFeatureFlags } from "@/lib/agency-brain/domain/modules";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignOutButton } from "@/components/SignOutButton";

type NavItem = {
  id: string;
  href?: string;
  label: string;
  badge?: number;
  beta?: boolean;
  icon: React.ReactNode;
  action?: () => void;
};

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const icons = {
  highlights:
    "M3 13.5l4.5-4.5 3 3 6-6M21 6h-4M21 6v4M4 20h16",
  command:
    "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  clients:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  campaigns:
    "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
  audiences:
    "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  creatives:
    "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.872M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.412 9.71 2.25 12 2.25c2.291 0 4.545.162 6.75.471v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0",
  creativeMemory:
    "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  reports:
    "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  alerts:
    "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  automations:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  admin:
    "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  billing:
    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
};

export function AppSidebar({
  userName,
  userEmail,
  alertCount,
  planName,
  planSlug,
  subscriptionStatus,
  allowCreativeMemoryAi = true,
  agencyBrainFeatures,
  isPlatformAdmin = false,
  collapsed,
  onToggleCollapse,
  variant = "sidebar",
  onNavigate
}: {
  userName: string;
  userEmail: string;
  alertCount: number;
  planName?: string;
  planSlug?: string;
  subscriptionStatus?: string;
  allowCreativeMemoryAi?: boolean;
  agencyBrainFeatures?: AgencyBrainFeatureFlags;
  isPlatformAdmin?: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  variant?: "sidebar" | "drawer";
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isDrawer = variant === "drawer";
  const effectiveCollapsed = isDrawer ? false : collapsed;

  const brainFeatures: AgencyBrainFeatureFlags = agencyBrainFeatures ?? {
    allowCreativeMemoryAi,
    allowAgencyBrainHypotheses: allowCreativeMemoryAi,
    allowAgencyBrainDna: allowCreativeMemoryAi,
    allowAgencyBrainTimeline: false,
    allowAgencyBrainExperiments: false,
    allowAgencyBrainActionPlans: false,
    allowAgencyBrainChat: false
  };

  const items: NavItem[] = [
    { id: "highlights", href: "/dashboard", label: t("highlights"), icon: <NavIcon d={icons.highlights} /> },
    { id: "clients", href: "/clients", label: t("clients"), icon: <NavIcon d={icons.clients} /> },
    { id: "campaigns", href: "/campaigns", label: t("campaigns"), icon: <NavIcon d={icons.campaigns} /> },
    { id: "audiences", href: "/audiences", label: t("audiences"), icon: <NavIcon d={icons.audiences} /> },
    { id: "creatives", href: "/creatives", label: t("creatives"), icon: <NavIcon d={icons.creatives} /> },
    { id: "reports", href: "/reports", label: t("reports"), icon: <NavIcon d={icons.reports} /> },
    {
      id: "alerts",
      href: "/alerts",
      label: t("alerts"),
      badge: alertCount > 0 ? alertCount : undefined,
      icon: <NavIcon d={icons.alerts} />
    },
    { id: "automations", href: "/automations", label: t("automations"), icon: <NavIcon d={icons.automations} /> },
    { id: "billing", href: "/billing", label: t("billing"), icon: <NavIcon d={icons.billing} /> },
    ...(isPlatformAdmin
      ? [
          {
            id: "admin",
            href: "/admin/users",
            label: t("adminPanel"),
            icon: <NavIcon d={icons.admin} />
          }
        ]
      : []),
    { id: "settings", href: "/settings", label: t("settings"), icon: <NavIcon d={icons.settings} /> }
  ];

  function isActive(item: NavItem) {
    const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
    if (item.id === "highlights")
      return base === "/dashboard" || base.startsWith("/dashboard/") || base === "/";
    if (item.id === "campaigns")
      return base === "/campaigns" || base.startsWith("/campaigns/");
    if (item.id === "alerts") return base === "/alerts" || base.startsWith("/alerts/");
    if (item.id === "clients") return base === "/clients" || base.startsWith("/clients/");
    if (item.id === "reports") return base === "/reports" || base.startsWith("/reports/");
    if (item.id === "creatives") return base === "/creatives" || base.startsWith("/creatives/");
    if (item.id === "audiences") return base === "/audiences" || base.startsWith("/audiences/");
    if (item.id === "automations") return base === "/automations" || base.startsWith("/automations/");
    if (item.id === "billing") return base === "/billing" || base.startsWith("/billing/");
    if (item.id === "admin") return base.startsWith("/admin/");
    if (item.id === "settings") return base === "/settings" || base.startsWith("/settings/");
    return item.href ? base === item.href || base.startsWith(`${item.href}/`) : false;
  }

  return (
    <aside
      className={`flex h-full shrink-0 flex-col bg-[#0f111a] text-slate-400 print:hidden ${
        isDrawer ? "w-full" : "border-r border-white/10 transition-[width] duration-200 ease-in-out"
      } ${!isDrawer ? (effectiveCollapsed ? "w-[72px]" : "w-[260px]") : ""}`}
    >
      {/* Logo + collapse (desktop sidebar only) */}
      {!isDrawer ? (
      <div
        className={`flex shrink-0 items-center border-b border-white/10 ${
          effectiveCollapsed ? "justify-center px-2 py-4" : "justify-between gap-2 px-4 py-4"
        }`}
      >
        <div className={`flex items-center gap-2.5 ${effectiveCollapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">
            ∞
          </div>
          {!effectiveCollapsed ? (
            <span className="text-[15px] font-semibold text-white">Traffic AI</span>
          ) : null}
        </div>
        {!effectiveCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={t("collapseSidebar")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={t("collapseSidebar")}
          >
            <NavIcon d="M15 19l-7-7 7-7" />
          </button>
        ) : null}
      </div>
      ) : null}

      {effectiveCollapsed && !isDrawer ? (
        <div className="flex shrink-0 justify-center py-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={t("expandSidebar")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={t("expandSidebar")}
          >
            <NavIcon d="M9 5l7 7-7 7" />
          </button>
        </div>
      ) : null}

      {/* Nav — scroll interno só se muitos itens */}
      <nav
        className={`sidebar-nav min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${
          effectiveCollapsed ? "space-y-1 px-2 py-2" : "space-y-0.5 px-3 py-2"
        }`}
      >
        {items.map((item) => {
          const active = isActive(item);
          const cls = `relative flex w-full items-center rounded-xl transition ${
            effectiveCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2 text-[13px]"
          } ${
            active
              ? "bg-white/10 font-semibold text-white"
              : "font-medium text-slate-400 hover:bg-white/5 hover:text-white"
          }`;

          const inner = (
            <>
              {active && !effectiveCollapsed ? (
                <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-violet-600" />
              ) : null}
              {item.icon}
              {!effectiveCollapsed ? (
                <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left">
                  <span className="truncate">{item.label}</span>
                  {item.beta ? (
                    <span className="shrink-0 rounded-full bg-violet-500/20 px-1.5 py-px text-[9px] font-bold uppercase leading-none tracking-wide text-violet-300">
                      Beta
                    </span>
                  ) : null}
                </span>
              ) : null}
              {item.badge && !effectiveCollapsed ? (
                <span
                  className="min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
              {item.badge && effectiveCollapsed ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </>
          );

          const navItem =
            item.action ? (
              <button
                type="button"
                onClick={() => {
                  item.action?.();
                  onNavigate?.();
                }}
                title={effectiveCollapsed ? item.label : undefined}
                className={cls}
              >
                {inner}
              </button>
            ) : (
              <Link
                href={item.href!}
                title={effectiveCollapsed ? item.label : undefined}
                className={cls}
                onClick={() => onNavigate?.()}
              >
                {inner}
              </Link>
            );

          return (
            <Fragment key={item.id}>
              {navItem}
              {item.id === "creatives" ? (
                <AgencyBrainNavGroup
                  collapsed={effectiveCollapsed}
                  agencyBrainFeatures={brainFeatures}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ) : null}
            </Fragment>
          );
        })}
      </nav>

      {/* Footer — sempre colado embaixo, mesmo fundo */}
      <div
        className={`shrink-0 border-t border-white/10 bg-[#0f111a] ${
          effectiveCollapsed ? "p-2" : "p-3"
        }`}
      >
        <div
          className={`flex items-center ${effectiveCollapsed ? "justify-center py-2" : "gap-2.5 px-1 py-2"}`}
          title={effectiveCollapsed ? userName : undefined}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!effectiveCollapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{userName}</div>
              <div className="truncate text-[11px] text-slate-500">
                {planName ?? t("planTitle")}
                {subscriptionStatus === "past_due" || subscriptionStatus === "suspended" ? (
                  <span className="ml-1 text-amber-400">!</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {!effectiveCollapsed ? (
          <Link
            href="/settings"
            className="mt-1 block rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300"
            onClick={() => onNavigate?.()}
          >
            {t("help")}
          </Link>
        ) : null}

        <div
          className={`space-y-0.5 border-white/10 ${effectiveCollapsed ? "mt-2 border-t pt-2" : "mt-2 border-t pt-2"}`}
        >
          <LanguageSwitcher variant="sidebar" collapsed={effectiveCollapsed} />
          <SignOutButton variant="sidebar" collapsed={effectiveCollapsed} />
        </div>
      </div>
    </aside>
  );
}
