"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { NavUpgradeLink } from "@/components/layout/NavUpgradeLink";
import { sidebarItemClasses, sidebarModuleClasses } from "@/components/layout/sidebar-nav-styles";
import {
  AGENCY_BRAIN_MVP_NAV,
  AGENCY_BRAIN_MVP_NAV_ITEMS,
  resolveAgencyBrainFeatures,
  type AgencyBrainFeatureFlags
} from "@/lib/agency-brain/domain/modules";
import type { ResolvedFeatureMap } from "@/lib/feature-flags/types";
import { isModuleEnabledInShell } from "@/lib/feature-flags/modules";

const STORAGE_KEY = "agency-brain-nav-expanded";

function readExpandedPreference(inAgencyBrain: boolean): boolean {
  if (inAgencyBrain) return true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    /* ignore */
  }
  return false;
}

type Props = {
  collapsed: boolean;
  agencyBrainFeatures: AgencyBrainFeatureFlags;
  /** Feature flags de plataforma (kill-switch). Ausente = tudo habilitado. */
  platformFeatures?: ResolvedFeatureMap;
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

function BrainNavIcon() {
  return <Brain size={18} strokeWidth={1.75} className="shrink-0" />;
}

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
  platformFeatures,
  pathname,
  permissionsReady = true,
  isPlatformAdmin = false,
  onNavigate
}: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const inAgencyBrain = base.startsWith("/agency-brain");
  const parentActive = isAgencyBrainActive(base);

  const featureOn = (id: string) =>
    !permissionsReady
      ? false
      : isPlatformAdmin || platformFeatures?.[id] === true;

  const features = resolveAgencyBrainFeatures(agencyBrainFeatures);
  const allowed = !permissionsReady || features.allowCreativeMemoryAi;

  const [expanded, setExpanded] = useState(() => readExpandedPreference(inAgencyBrain));

  useEffect(() => {
    if (inAgencyBrain) setExpanded(true);
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

  // Plataforma desligou o módulo Brain → esconde por completo (não mostra "locked/upgrade").
  if (
    !isModuleEnabledInShell(platformFeatures, "brain", {
      ready: permissionsReady,
      isPlatformAdmin
    })
  ) {
    return null;
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
        <BrainNavIcon />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-start gap-0.5">
        <Link
          href={AGENCY_BRAIN_MVP_NAV.route}
          onClick={() => onNavigate?.()}
          className={`${sidebarItemClasses(parentActive)} min-w-0 flex-1 !pr-1`}
        >
          <BrainNavIcon />
          <span className="min-w-0 flex-1 whitespace-normal text-left leading-snug">
            {t(AGENCY_BRAIN_MVP_NAV.navKey)}
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
          {AGENCY_BRAIN_MVP_NAV_ITEMS.filter((item) => featureOn(`brain.${item.id}`)).map((item) => {
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
          {featureOn("brain.automations") ? (
            <Link
              href="/automations"
              onClick={() => onNavigate?.()}
              className={sidebarModuleClasses(undefined, isAutomationsActive(base))}
            >
              {t("automations")}
            </Link>
          ) : null}
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
      icon={<BrainNavIcon />}
      onNavigate={onNavigate}
    />
  );
}
