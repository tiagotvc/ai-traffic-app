"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { sidebarItemClasses, sidebarModuleClasses } from "@/components/layout/sidebar-nav-styles";
import {
  CREATIVE_STUDIO_NAV,
  CREATIVE_STUDIO_NAV_ITEMS,
  isCreativeStudioActive,
  isCreativeStudioCanvasActive,
  isCreativeStudioGenerationActive,
  isCreativeStudioLibraryActive,
  isCreativeStudioVideoActive
} from "@/lib/creative-studio/nav";

const STORAGE_KEY = "creative-studio-nav-expanded";

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

function CreativeStudioNavIcon() {
  return <Palette size={18} strokeWidth={1.75} className="shrink-0" />;
}

type Props = {
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
};

/** Sempre visível — Estúdio Criativo não tem module flag/plan gate hoje (ver
 * `src/lib/feature-flags/registry.ts` e `src/lib/billing/nav-permissions.ts`). */
export function CreativeStudioNavGroup({ collapsed, pathname, onNavigate }: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const inGroup = isCreativeStudioActive(base);
  const parentActive = isCreativeStudioGenerationActive(base);

  const [expanded, setExpanded] = useState(inGroup);

  useEffect(() => {
    if (inGroup) {
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
  }, [inGroup]);

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
        href={CREATIVE_STUDIO_NAV.route}
        title={t(CREATIVE_STUDIO_NAV.navKey)}
        onClick={() => onNavigate?.()}
        className={sidebarItemClasses(parentActive, true)}
      >
        <CreativeStudioNavIcon />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-start gap-0.5">
        <Link
          href={CREATIVE_STUDIO_NAV.route}
          onClick={() => onNavigate?.()}
          className={`${sidebarItemClasses(parentActive)} min-w-0 flex-1 !pr-1`}
        >
          <CreativeStudioNavIcon />
          <span className="min-w-0 flex-1 whitespace-normal text-left leading-snug">
            {t(CREATIVE_STUDIO_NAV.navKey)}
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
          {CREATIVE_STUDIO_NAV_ITEMS.map((item) => {
            const active =
              item.id === "generation"
                ? isCreativeStudioGenerationActive(base)
                : item.id === "canvas"
                  ? isCreativeStudioCanvasActive(base)
                  : item.id === "video"
                    ? isCreativeStudioVideoActive(base)
                    : isCreativeStudioLibraryActive(base);
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
