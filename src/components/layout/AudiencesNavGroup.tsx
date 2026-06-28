"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { NavUpgradeLink } from "@/components/layout/NavUpgradeLink";
import { sidebarItemClasses, sidebarModuleClasses } from "@/components/layout/sidebar-nav-styles";
import {
  AUDIENCES_NAV,
  AUDIENCES_NAV_ITEMS,
  isAudiencesActive,
  isAudiencesMetaActive,
  isAudiencesPersonasActive,
  isAudiencesZonesActive
} from "@/lib/audiences/nav";
import { isNavItemAllowed } from "@/lib/billing/nav-permissions";
import type { PlanLimits } from "@/lib/billing/types";
import { FREE_LIMITS } from "@/lib/billing/types";

const STORAGE_KEY = "audiences-nav-expanded";

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

function AudiencesNavIcon() {
  return <Target size={18} strokeWidth={1.75} className="shrink-0" />;
}

type Props = {
  collapsed: boolean;
  planLimits?: PlanLimits;
  planLimitsReady?: boolean;
  pathname: string;
  onNavigate?: () => void;
};

export function AudiencesNavGroup({
  collapsed,
  planLimits = FREE_LIMITS,
  planLimitsReady = true,
  pathname,
  onNavigate
}: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const inAudiences = base.startsWith("/audiences");
  const parentActive = isAudiencesActive(base);
  const allowed = !planLimitsReady || isNavItemAllowed("audiences", planLimits);

  const [expanded, setExpanded] = useState(inAudiences);

  useEffect(() => {
    if (inAudiences) {
      setExpanded(true);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setExpanded(true);
      else if (stored === "false") setExpanded(false);
    } catch {
      /* ignore */
    }
  }, [inAudiences]);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }

  if (!allowed) {
    return (
      <NavUpgradeLink
        label={t(AUDIENCES_NAV.navKey)}
        collapsed={collapsed}
        icon={<AudiencesNavIcon />}
        onNavigate={onNavigate}
      />
    );
  }

  if (collapsed) {
    return (
      <Link
        href={AUDIENCES_NAV.route}
        title={t(AUDIENCES_NAV.navKey)}
        onClick={() => onNavigate?.()}
        className={sidebarItemClasses(parentActive, true)}
      >
        <AudiencesNavIcon />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-start gap-0.5">
        <Link
          href={AUDIENCES_NAV.route}
          onClick={() => onNavigate?.()}
          className={`${sidebarItemClasses(parentActive)} min-w-0 flex-1 !pr-1`}
        >
          <AudiencesNavIcon />
          <span className="min-w-0 flex-1 whitespace-normal text-left leading-snug">
            {t(AUDIENCES_NAV.navKey)}
          </span>
        </Link>
        <button
          type="button"
          onClick={toggleExpanded}
          className="mt-1 shrink-0 rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/5 hover:text-[#f8fafc]"
          aria-expanded={expanded}
          aria-label={expanded ? t("collapseSidebar") : t("expandSidebar")}
        >
          <NavIcon d={expanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
        </button>
      </div>

      {expanded ? (
        <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
          {AUDIENCES_NAV_ITEMS.map((item) => {
            const active =
              item.id === "personas"
                ? isAudiencesPersonasActive(base)
                : item.id === "zones"
                  ? isAudiencesZonesActive(base)
                  : isAudiencesMetaActive(base);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => onNavigate?.()}
                className={sidebarModuleClasses(undefined, active)}
              >
                {t(item.navKey)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
