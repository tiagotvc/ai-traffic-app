"use client";

import { useTranslations } from "next-intl";
import {
  Home,
  LayoutGrid,
  Megaphone,
  Trophy,
  Users
} from "lucide-react";
import { usePathname } from "next/navigation";

import { AgencyBrainNavGroup } from "@/components/layout/AgencyBrainNavGroup";
import { AudiencesNavGroup } from "@/components/layout/AudiencesNavGroup";
import { ReportsNavGroup } from "@/components/layout/ReportsNavGroup";
import { NavUpgradeLink } from "@/components/layout/NavUpgradeLink";
import {
  SidebarCollapseButton,
  SidebarCollapseFab,
  SidebarLogoIcon
} from "@/components/layout/SidebarUxChrome";
import type { AgencyBrainFeatureFlags } from "@/lib/agency-brain/domain/modules";
import type { ResolvedFeatureMap } from "@/lib/feature-flags/types";
import { isModuleEnabledInShell } from "@/lib/feature-flags/modules";
import { isNavItemAllowed, type GatedNavId } from "@/lib/billing/nav-permissions";
import type { PlanLimits } from "@/lib/billing/types";
import { FREE_LIMITS } from "@/lib/billing/types";
import { Link } from "@/i18n/navigation";
import { SidebarFooter } from "@/components/layout/SidebarFooter";
import { sidebarItemClasses } from "@/components/layout/sidebar-nav-styles";

type NavItem = {
  id: string;
  href?: string;
  label: string;
  badge?: number;
  beta?: boolean;
  icon: React.ReactNode;
  action?: () => void;
  gate?: GatedNavId;
};

export function AppSidebar({
  userName,
  userEmail,
  planName,
  planSlug,
  subscriptionStatus,
  allowCreativeMemoryAi = true,
  agencyBrainFeatures,
  platformFeatures,
  planLimits = FREE_LIMITS,
  planLimitsReady = true,
  isPlatformAdmin = false,
  collapsed,
  onToggleCollapse,
  variant = "sidebar",
  onNavigate
}: {
  userName: string;
  userEmail: string;
  planName?: string;
  planSlug?: string;
  subscriptionStatus?: string;
  allowCreativeMemoryAi?: boolean;
  agencyBrainFeatures?: AgencyBrainFeatureFlags;
  platformFeatures?: ResolvedFeatureMap;
  planLimits?: PlanLimits;
  planLimitsReady?: boolean;
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

  const shellModuleOpts = { ready: planLimitsReady };
  const moduleOn = (id: string) =>
    isModuleEnabledInShell(platformFeatures, id, shellModuleOpts);

  const items: NavItem[] = [
    {
      id: "dashboard",
      href: "/dashboard",
      label: t("dashboard"),
      icon: <Home size={18} strokeWidth={1.75} className="shrink-0" />
    },
    ...(moduleOn("visions")
      ? [
          {
            id: "views",
            href: "/dashboard/views",
            label: t("views"),
            icon: <LayoutGrid size={18} strokeWidth={1.75} className="shrink-0" />
          } satisfies NavItem
        ]
      : []),
    { id: "clients", href: "/clients", label: t("clients"), icon: <Users size={18} strokeWidth={1.75} className="shrink-0" /> },
    ...(moduleOn("campaigns")
      ? [
          {
            id: "campaigns",
            href: "/campaigns",
            label: t("campaigns"),
            icon: <Megaphone size={18} strokeWidth={1.75} className="shrink-0" />,
            gate: "campaigns" as const
          } satisfies NavItem
        ]
      : []),
    {
      id: "creatives",
      href: "/creatives",
      label: t("creatives"),
      icon: <Trophy size={18} strokeWidth={1.75} className="shrink-0" />,
      gate: "creatives"
    }
  ];

  type SidebarEntry =
    | { kind: "item"; item: NavItem }
    | { kind: "audiences" }
    | { kind: "brain" }
    | { kind: "reports" };

  const entries: SidebarEntry[] = [
    { kind: "item", item: items[0]! },
    ...(items.some((i) => i.id === "views")
      ? [{ kind: "item" as const, item: items.find((i) => i.id === "views")! }]
      : []),
    { kind: "item", item: items.find((i) => i.id === "clients")! },
    ...(items.some((i) => i.id === "campaigns")
      ? [{ kind: "item" as const, item: items.find((i) => i.id === "campaigns")! }]
      : []),
    ...(moduleOn("audiences") ? [{ kind: "audiences" as const }] : []),
    { kind: "item", item: items.find((i) => i.id === "creatives")! },
    ...(moduleOn("brain") ? [{ kind: "brain" as const }] : []),
    ...(moduleOn("reports") ? [{ kind: "reports" as const }] : [])
  ];

  function isActive(item: NavItem) {
    const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
    if (item.id === "dashboard") return base === "/dashboard" || base === "/";
    if (item.id === "views")
      return base === "/dashboard/views" || base.startsWith("/dashboard/apps/");
    if (item.id === "campaigns")
      return base === "/campaigns" || base.startsWith("/campaigns/");
    if (item.id === "clients") return base === "/clients" || base.startsWith("/clients/");
    if (item.id === "reports") return base === "/reports" || base.startsWith("/reports/");
    if (item.id === "creatives") return base === "/creatives" || base.startsWith("/creatives/");
    if (item.id === "audiences") return base === "/audiences" || base.startsWith("/audiences/");
    if (item.id === "settings") return base === "/settings" || base.startsWith("/settings/");
    return item.href ? base === item.href || base.startsWith(`${item.href}/`) : false;
  }

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col text-[#94a3b8] print:hidden ${
        isDrawer ? "w-full" : "border-r border-[var(--sidebar-border)] transition-[width] duration-300 ease-in-out"
      } ${!isDrawer ? (effectiveCollapsed ? "w-16" : "w-60") : ""}`}
      style={{ background: "#0a0f14" }}
    >
      {!isDrawer ? (
        <div
          className={`relative flex h-14 shrink-0 items-center border-b border-[var(--sidebar-border)] ${
            effectiveCollapsed ? "justify-center px-2" : "px-3"
          }`}
        >
          {!effectiveCollapsed ? (
            <div className="flex min-w-0 flex-1 items-center pr-9">
              <SidebarLogoIcon collapsed={false} />
            </div>
          ) : (
            <SidebarLogoIcon collapsed />
          )}
          {!effectiveCollapsed ? (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <SidebarCollapseButton onClick={onToggleCollapse} title={t("collapseSidebar")} />
            </div>
          ) : null}
        </div>
      ) : null}

      <SidebarCollapseFab collapsed={effectiveCollapsed && !isDrawer} onToggle={onToggleCollapse} />

      <nav
        className={`sidebar-nav min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${
          effectiveCollapsed ? "space-y-1 px-2 py-3" : "space-y-1 px-3 py-3"
        }`}
      >
        {entries.map((entry) => {
          if (entry.kind === "audiences") {
            return (
              <AudiencesNavGroup
                key="audiences"
                collapsed={effectiveCollapsed}
                planLimits={planLimits}
                planLimitsReady={planLimitsReady}
                platformFeatures={platformFeatures}
                isPlatformAdmin={isPlatformAdmin}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            );
          }
          if (entry.kind === "brain") {
            return (
              <AgencyBrainNavGroup
                key="brain"
                collapsed={effectiveCollapsed}
                agencyBrainFeatures={brainFeatures}
                platformFeatures={platformFeatures}
                isPlatformAdmin={isPlatformAdmin}
                pathname={pathname}
                permissionsReady={planLimitsReady}
                onNavigate={onNavigate}
              />
            );
          }
          if (entry.kind === "reports") {
            return (
              <ReportsNavGroup
                key="reports"
                collapsed={effectiveCollapsed}
                planLimits={planLimits}
                planLimitsReady={planLimitsReady}
                platformFeatures={platformFeatures}
                isPlatformAdmin={isPlatformAdmin}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            );
          }

          const item = entry.item;
          const active = isActive(item);
          const gated = planLimitsReady && item.gate && !isNavItemAllowed(item.gate, planLimits);

          if (gated) {
            return (
              <NavUpgradeLink
                key={item.id}
                label={item.label}
                collapsed={effectiveCollapsed}
                active={active}
                icon={item.icon}
                onNavigate={onNavigate}
              />
            );
          }

          const cls = sidebarItemClasses(active, effectiveCollapsed);

          const inner = (
            <>
              {item.icon}
              {!effectiveCollapsed ? (
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                  <span className="min-w-0 whitespace-normal leading-snug">{item.label}</span>
                  {item.beta ? (
                    <span
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wider"
                      style={{
                        background: "rgba(124,58,237,0.25)",
                        color: "#a78bfa",
                        border: "1px solid rgba(124,58,237,0.4)"
                      }}
                    >
                      BETA
                    </span>
                  ) : null}
                </span>
              ) : null}
              {item.badge && !effectiveCollapsed ? (
                <span className="min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
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

          if (item.action) {
            return (
              <button
                key={item.id}
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
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href!}
              title={effectiveCollapsed ? item.label : undefined}
              className={cls}
              onClick={() => onNavigate?.()}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      <SidebarFooter
        userName={userName}
        userEmail={userEmail}
        planName={planName}
        subscriptionStatus={subscriptionStatus}
        collapsed={effectiveCollapsed}
        isPlatformAdmin={isPlatformAdmin}
        onNavigate={onNavigate}
        mobileFullScreen={isDrawer}
      />
    </aside>
  );
}
