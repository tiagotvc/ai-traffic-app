"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

import { NavUpgradeLink } from "@/components/layout/NavUpgradeLink";
import { sidebarItemClasses, sidebarModuleClasses } from "@/components/layout/sidebar-nav-styles";
import {
  AGENCY_BRAIN_MVP_NAV,
  AGENCY_BRAIN_MVP_NAV_ITEMS,
  resolveAgencyBrainFeatures,
  type AgencyBrainFeatureFlags
} from "@/lib/agency-brain/domain/modules";

const STORAGE_KEY = "agency-brain-nav-expanded";

type Props = {
  collapsed: boolean;
  agencyBrainFeatures: AgencyBrainFeatureFlags;
  pathname: string;
  permissionsReady?: boolean;
  isPlatformAdmin?: boolean;
  onNavigate?: () => void;
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

const brainIcon =
  "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z";

function isLearningsActive(base: string): boolean {
  if (base === "/agency-brain/learnings") return true;
  if (/^\/agency-brain\/learnings\/[^/]+$/.test(base)) return true;
  return base === "/agency-brain";
}

function isHypothesesActive(base: string): boolean {
  if (/^\/agency-brain\/hypotheses\/[^/]+$/.test(base)) return true;
  return base === "/agency-brain/hypotheses";
}

function isAutomationsActive(base: string): boolean {
  return base === "/automations" || base.startsWith("/automations/");
}

function isAgencyBrainActive(base: string): boolean {
  return isLearningsActive(base) || isHypothesesActive(base) || isAutomationsActive(base);
}

export function AgencyBrainNavGroup({
  collapsed,
  agencyBrainFeatures,
  pathname,
  permissionsReady = true,
  onNavigate
}: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const inAgencyBrain = base.startsWith("/agency-brain");
  const parentActive = isAgencyBrainActive(base);

  const features = resolveAgencyBrainFeatures(agencyBrainFeatures);
  const allowed = !permissionsReady || features.allowCreativeMemoryAi;

  const [expanded, setExpanded] = useState(!collapsed || inAgencyBrain);

  useEffect(() => {
    if (inAgencyBrain || !collapsed) setExpanded(true);
  }, [inAgencyBrain, collapsed]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setExpanded(true);
      if (stored === "false" && !inAgencyBrain) setExpanded(false);
    } catch {
      /* ignore */
    }
  }, [inAgencyBrain]);

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
    return <AgencyBrainNavLocked collapsed={collapsed} onNavigate={onNavigate} />;
  }

  if (collapsed) {
    return (
      <Link
        href={AGENCY_BRAIN_MVP_NAV.route}
        title={t(AGENCY_BRAIN_MVP_NAV.navKey)}
        onClick={() => onNavigate?.()}
        className={sidebarItemClasses(parentActive, true)}
      >
        <NavIcon d={brainIcon} />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5">
        <Link
          href={AGENCY_BRAIN_MVP_NAV.route}
          onClick={() => onNavigate?.()}
          className={`${sidebarItemClasses(parentActive)} !pr-1`}
        >
          <NavIcon d={brainIcon} />
          <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left">
            <span className="truncate">{t(AGENCY_BRAIN_MVP_NAV.navKey)}</span>
            <span
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wider"
              style={{
                background: "rgba(124,58,237,0.25)",
                color: "#a78bfa",
                border: "1px solid rgba(124,58,237,0.4)"
              }}
            >
              Beta
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={toggleExpanded}
          className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/5 hover:text-[#f8fafc]"
          aria-expanded={expanded}
          aria-label={expanded ? t("collapseSidebar") : t("expandSidebar")}
        >
          <NavIcon d={expanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
        </button>
      </div>

      {expanded ? (
        <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
          {AGENCY_BRAIN_MVP_NAV_ITEMS.map((item) => {
            const active =
              item.id === "learnings" ? isLearningsActive(base) : isHypothesesActive(base);
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
          <Link
            href="/automations"
            onClick={() => onNavigate?.()}
            className={sidebarModuleClasses(undefined, isAutomationsActive(base))}
          >
            {t("automations")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function AgencyBrainNavLocked({
  collapsed,
  onNavigate
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  return (
    <NavUpgradeLink
      label={t("agencyBrain")}
      collapsed={collapsed}
      icon={<NavIcon d={brainIcon} />}
      onNavigate={onNavigate}
    />
  );
}
