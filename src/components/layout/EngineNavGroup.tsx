"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { sidebarItemClasses, sidebarModuleClasses } from "@/components/layout/sidebar-nav-styles";
import type { ResolvedFeatureMap } from "@/lib/feature-flags/types";
import { isModuleEnabledInShell } from "@/lib/feature-flags/modules";

const STORAGE_KEY = "engine-nav-expanded";

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
  pathname: string;
  onNavigate?: () => void;
};

/** Grupo do Motor de regras (Orion Engine) no sidebar: Regras + Execuções. */
export function EngineNavGroup({
  collapsed,
  planLimitsReady = true,
  platformFeatures,
  pathname,
  onNavigate
}: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const inEngine = base === "/automations" || base.startsWith("/automations/");
  const rulesActive = inEngine && !base.startsWith("/automations/executions");
  const executionsActive = base.startsWith("/automations/executions");

  const [expanded, setExpanded] = useState(inEngine);

  useEffect(() => {
    if (inEngine) {
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
  }, [inEngine]);

  if (!isModuleEnabledInShell(platformFeatures, "engine", { ready: planLimitsReady })) {
    return null;
  }

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
        href="/automations"
        title={t("rulesEngine")}
        onClick={() => onNavigate?.()}
        className={sidebarItemClasses(inEngine, true)}
      >
        <Zap size={18} strokeWidth={1.75} className="shrink-0" />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-start gap-0.5">
        <Link
          href="/automations"
          onClick={() => onNavigate?.()}
          className={`${sidebarItemClasses(inEngine)} min-w-0 flex-1 !pr-1`}
        >
          <Zap size={18} strokeWidth={1.75} className="shrink-0" />
          <span className="min-w-0 flex-1 whitespace-normal text-left leading-snug">
            {t("rulesEngine")}
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
          <Link
            href="/automations"
            onClick={() => onNavigate?.()}
            className={sidebarModuleClasses(undefined, rulesActive)}
          >
            {t("engineRules")}
          </Link>
          <Link
            href="/automations/executions"
            onClick={() => onNavigate?.()}
            className={sidebarModuleClasses(undefined, executionsActive)}
          >
            {t("engineExecutions")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
