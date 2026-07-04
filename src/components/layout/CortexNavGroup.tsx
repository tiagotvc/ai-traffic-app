"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { sidebarItemClasses, sidebarModuleClasses } from "@/components/layout/sidebar-nav-styles";
import type { AgencyBrainFeatureFlags } from "@/lib/agency-brain/domain/modules";
import type { ResolvedFeatureMap } from "@/lib/feature-flags/types";
import { isFeatureEnabled } from "@/lib/feature-flags/registry";
import { isModuleEnabledInShell } from "@/lib/feature-flags/modules";

const STORAGE_KEY = "cortex-nav-expanded";

function ChevronIcon({ d }: { d: string }) {
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

type Props = {
  collapsed: boolean;
  planLimitsReady?: boolean;
  platformFeatures?: ResolvedFeatureMap;
  agencyBrainFeatures?: AgencyBrainFeatureFlags;
  pathname: string;
  onNavigate?: () => void;
};

/**
 * ORION CORTEX no sidebar — o cérebro operacional como UM produto: Overview,
 * Recomendações, Automações, Aprendizados, Hipóteses e Execuções. Absorve os antigos
 * grupos "Cérebro da agência" e "Motor de regras" (reorg 2026-07-04).
 */
export function CortexNavGroup({
  collapsed,
  planLimitsReady = true,
  platformFeatures,
  agencyBrainFeatures,
  pathname,
  onNavigate
}: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const inCortex =
    base.startsWith("/cortex") || base.startsWith("/automations") || base.startsWith("/agency-brain");

  const [expanded, setExpanded] = useState(inCortex);

  useEffect(() => {
    if (inCortex) {
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
  }, [inCortex]);

  const engineOn = isModuleEnabledInShell(platformFeatures, "engine", { ready: planLimitsReady });
  const brainOn = isModuleEnabledInShell(platformFeatures, "brain", { ready: planLimitsReady });
  if (!engineOn && !brainOn) return null;

  const brainAllowed = agencyBrainFeatures?.allowCreativeMemoryAi ?? true;
  const featureOn = (id: string) =>
    platformFeatures ? isFeatureEnabled(platformFeatures, id) : true;

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
        href="/cortex"
        title={t("cortex")}
        onClick={() => onNavigate?.()}
        className={sidebarItemClasses(inCortex, true)}
      >
        <Brain size={18} strokeWidth={1.75} className="shrink-0" />
      </Link>
    );
  }

  const items: Array<{ href: string; label: string; active: boolean }> = [
    { href: "/cortex", label: t("cortexOverview"), active: base === "/cortex" },
    {
      href: "/cortex/recommendations",
      label: t("recommendations"),
      active: base.startsWith("/cortex/recommendations")
    },
    ...(engineOn
      ? [
          {
            href: "/automations",
            label: t("automations"),
            active: base.startsWith("/automations") && !base.startsWith("/automations/executions")
          }
        ]
      : []),
    ...(brainOn && brainAllowed && featureOn("brain.learnings")
      ? [
          {
            href: "/agency-brain/learnings",
            label: t("agencyBrainLearnings"),
            active: base.startsWith("/agency-brain/learnings") || base === "/agency-brain"
          }
        ]
      : []),
    ...(brainOn && brainAllowed && featureOn("brain.hypotheses")
      ? [
          {
            href: "/agency-brain/hypotheses",
            label: t("agencyBrainHypotheses"),
            active: base.startsWith("/agency-brain/hypotheses")
          }
        ]
      : []),
    ...(engineOn
      ? [
          {
            href: "/automations/executions",
            label: t("engineExecutions"),
            active: base.startsWith("/automations/executions")
          }
        ]
      : [])
  ];

  return (
    <div className="space-y-0.5">
      <div className="flex items-start gap-0.5">
        <Link
          href="/cortex"
          onClick={() => onNavigate?.()}
          className={`${sidebarItemClasses(inCortex)} min-w-0 flex-1 !pr-1`}
        >
          <Brain size={18} strokeWidth={1.75} className="shrink-0" />
          <span className="min-w-0 flex-1 whitespace-normal text-left leading-snug">
            {t("cortex")}
          </span>
        </Link>
        <button
          type="button"
          onClick={toggleExpanded}
          className="mt-1 shrink-0 rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-white/5 hover:text-[#f8fafc]"
          aria-expanded={expanded}
          aria-label={expanded ? t("collapseSidebar") : t("expandSidebar")}
        >
          <ChevronIcon d={expanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
        </button>
      </div>

      {expanded ? (
        <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={sidebarModuleClasses(undefined, item.active)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
