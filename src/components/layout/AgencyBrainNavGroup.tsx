"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

import {
  AGENCY_BRAIN_MODULE_REGISTRY,
  isAgencyBrainModuleEnabled,
  resolveAgencyBrainFeatures,
  type AgencyBrainModuleMeta
} from "@/lib/agency-brain/domain/modules";

const STORAGE_KEY = "agency-brain-nav-expanded";

type Props = {
  collapsed: boolean;
  allowCreativeMemoryAi: boolean;
  pathname: string;
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

export function AgencyBrainNavGroup({ collapsed, allowCreativeMemoryAi, pathname }: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const inAgencyBrain = base.startsWith("/agency-brain");

  const features = resolveAgencyBrainFeatures({ allowCreativeMemoryAi });
  const modules = AGENCY_BRAIN_MODULE_REGISTRY.filter((m) => isAgencyBrainModuleEnabled(m, features));

  const [expanded, setExpanded] = useState(inAgencyBrain);

  useEffect(() => {
    if (inAgencyBrain) setExpanded(true);
  }, [inAgencyBrain]);

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

  if (!allowCreativeMemoryAi || !modules.length) return null;

  const parentActive = inAgencyBrain;

  function subActive(mod: AgencyBrainModuleMeta) {
    return base === mod.route || base.startsWith(`${mod.route}/`);
  }

  if (collapsed) {
    return (
      <Link
        href="/agency-brain/learnings"
        title={t("agencyBrain")}
        className={`relative flex w-full items-center justify-center rounded-xl px-0 py-2.5 transition ${
          parentActive
            ? "bg-white/10 font-semibold text-white"
            : "font-medium text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <NavIcon d={brainIcon} />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={toggleExpanded}
        className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition ${
          parentActive
            ? "bg-white/10 font-semibold text-white"
            : "font-medium text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        {parentActive ? (
          <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-violet-600" />
        ) : null}
        <NavIcon d={brainIcon} />
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left">
          <span className="truncate">{t("agencyBrain")}</span>
          <span className="shrink-0 rounded-full bg-violet-500/20 px-1.5 py-px text-[9px] font-bold uppercase leading-none tracking-wide text-violet-300">
            Beta
          </span>
        </span>
        <NavIcon d={expanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
      </button>

      {expanded ? (
        <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
          {modules.map((mod) => {
            const active = subActive(mod);
            return (
              <Link
                key={mod.id}
                href={mod.route}
                className={`block rounded-lg px-3 py-1.5 text-[12px] transition ${
                  active
                    ? "bg-violet-500/20 font-semibold text-violet-200"
                    : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                }`}
              >
                {t(mod.navKey)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
