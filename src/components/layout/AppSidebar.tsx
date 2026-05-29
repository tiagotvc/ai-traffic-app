"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignOutButton } from "@/components/SignOutButton";

type NavItem = {
  id: string;
  href?: string;
  label: string;
  badge?: number;
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
  command:
    "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  clients:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  campaigns:
    "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
  audiences:
    "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  creatives:
    "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  reports:
    "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  alerts:
    "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  automations:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
};

export function AppSidebar({
  userName,
  userEmail,
  alertCount,
  collapsed,
  onToggleCollapse
}: {
  userName: string;
  userEmail: string;
  alertCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const items: NavItem[] = [
    { id: "command", href: "/command", label: t("command"), icon: <NavIcon d={icons.command} /> },
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
    { id: "settings", href: "/settings", label: t("settings"), icon: <NavIcon d={icons.settings} /> }
  ];

  function isActive(item: NavItem) {
    const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
    if (item.id === "command") return base === "/command" || base === "/";
    if (item.id === "campaigns")
      return base === "/campaigns" || base.startsWith("/campaigns/");
    if (item.id === "alerts") return base === "/alerts" || base.startsWith("/alerts/");
    if (item.id === "clients") return base === "/clients" || base.startsWith("/clients/");
    if (item.id === "reports") return base === "/reports" || base.startsWith("/reports/");
    if (item.id === "creatives") return base === "/creatives" || base.startsWith("/creatives/");
    if (item.id === "audiences") return base === "/audiences" || base.startsWith("/audiences/");
    if (item.id === "automations") return base === "/automations" || base.startsWith("/automations/");
    if (item.id === "settings") return base === "/settings" || base.startsWith("/settings/");
    return item.href ? base === item.href || base.startsWith(`${item.href}/`) : false;
  }

  return (
    <aside
      className={`flex h-full shrink-0 flex-col bg-[#0f111a] text-slate-400 transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      {/* Logo + collapse */}
      <div
        className={`flex shrink-0 items-center border-b border-white/10 ${
          collapsed ? "justify-center px-2 py-4" : "justify-between gap-2 px-4 py-4"
        }`}
      >
        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">
            ∞
          </div>
          {!collapsed ? (
            <span className="text-[15px] font-semibold text-white">Traffic AI</span>
          ) : null}
        </div>
        {!collapsed ? (
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

      {collapsed ? (
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
          collapsed ? "space-y-1 px-2 py-2" : "space-y-0.5 px-3 py-2"
        }`}
      >
        {items.map((item) => {
          const active = isActive(item);
          const cls = `relative flex w-full items-center rounded-xl font-medium transition ${
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2 text-[13px]"
          } ${
            active
              ? "bg-violet-600 text-white"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`;

          const inner = (
            <>
              {item.icon}
              {!collapsed ? <span className="flex-1 truncate text-left">{item.label}</span> : null}
              {item.badge && !collapsed ? (
                <span
                  className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
                    active ? "bg-white/25 text-white" : "bg-red-500 text-white"
                  }`}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
              {item.badge && collapsed ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </>
          );

          if (item.action) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                title={collapsed ? item.label : undefined}
                className={cls}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href!}
              title={collapsed ? item.label : undefined}
              className={cls}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      {/* Footer — sempre colado embaixo, mesmo fundo */}
      <div
        className={`shrink-0 border-t border-white/10 bg-[#0f111a] ${
          collapsed ? "p-2" : "p-3"
        }`}
      >
        <div
          className={`flex items-center ${collapsed ? "justify-center py-2" : "gap-2.5 px-1 py-2"}`}
          title={collapsed ? userName : undefined}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{userName}</div>
              <div className="truncate text-[11px] text-slate-500">Admin</div>
            </div>
          ) : null}
        </div>

        {!collapsed ? (
          <Link
            href="/settings"
            className="mt-1 block rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300"
          >
            {t("help")}
          </Link>
        ) : null}

        <div
          className={`space-y-0.5 border-white/10 ${collapsed ? "mt-2 border-t pt-2" : "mt-2 border-t pt-2"}`}
        >
          <LanguageSwitcher variant="sidebar" collapsed={collapsed} />
          <SignOutButton variant="sidebar" collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
