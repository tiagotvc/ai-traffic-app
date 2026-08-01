"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { sidebarItemClasses, sidebarModuleClasses } from "@/components/layout/sidebar-nav-styles";
import {
  COMMANDER_NAV,
  COMMANDER_NAV_ITEMS,
  isCommanderActive,
  isCommanderOverviewActive,
  isCommanderScientistsActive,
  isCommanderSettingsActive
} from "@/lib/commander/nav";
import type { ResolvedFeatureMap } from "@/lib/feature-flags/types";
import { isModuleEnabledInShell } from "@/lib/feature-flags/modules";
import type { PlanLimits } from "@/lib/billing/types";
import { FREE_LIMITS } from "@/lib/billing/types";

const STORAGE_KEY = "commander-nav-expanded";

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

function CommanderNavIcon() {
  return <Sparkles size={18} strokeWidth={1.75} className="shrink-0" />;
}

function LockIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0 text-amber-400/90"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

type Props = {
  collapsed: boolean;
  planLimits?: PlanLimits;
  planLimitsReady?: boolean;
  platformFeatures?: ResolvedFeatureMap;
  pathname: string;
  onNavigate?: () => void;
};

export function CommanderNavGroup({
  collapsed,
  planLimits = FREE_LIMITS,
  planLimitsReady = true,
  platformFeatures,
  pathname,
  onNavigate
}: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const inCommander = isCommanderActive(base);
  const parentActive = isCommanderOverviewActive(base);

  const [expanded, setExpanded] = useState(inCommander);

  useEffect(() => {
    if (inCommander) {
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
  }, [inCommander]);

  if (!isModuleEnabledInShell(platformFeatures, "commander", { ready: planLimitsReady })) {
    return null;
  }

  // Cientistas é Advanced/Agency — no Individual o item some da navegação normal e
  // vira um link travado (mesmo tratamento do submenu Orion Persona® em Públicos).
  const scientistsAllowed = !planLimitsReady || planLimits.allowCopilot;

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }

  if (collapsed) {
    return (
      <Link
        href={COMMANDER_NAV.route}
        title={t(COMMANDER_NAV.navKey)}
        onClick={() => onNavigate?.()}
        className={sidebarItemClasses(parentActive, true)}
      >
        <CommanderNavIcon />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-start gap-0.5">
        <Link
          href={COMMANDER_NAV.route}
          onClick={() => onNavigate?.()}
          className={`${sidebarItemClasses(parentActive)} min-w-0 flex-1 !pr-1`}
        >
          <CommanderNavIcon />
          <span className="min-w-0 flex-1 whitespace-normal text-left leading-snug">
            {t(COMMANDER_NAV.navKey)}
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
          {COMMANDER_NAV_ITEMS.map((item) => {
            const active =
              item.id === "overview"
                ? isCommanderOverviewActive(base)
                : item.id === "scientists"
                  ? isCommanderScientistsActive(base)
                  : isCommanderSettingsActive(base);
            const locked = item.id === "scientists" && !scientistsAllowed;
            if (locked) {
              return (
                <Link
                  key={item.id}
                  href="/billing"
                  onClick={() => onNavigate?.()}
                  className={`${sidebarModuleClasses(undefined, false)} flex items-center justify-between gap-1.5 opacity-70`}
                >
                  <span className="truncate">{t(item.navKey)}</span>
                  <LockIcon />
                </Link>
              );
            }
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
