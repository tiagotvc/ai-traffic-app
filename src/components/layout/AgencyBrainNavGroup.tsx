"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

import { NavUpgradeLink } from "@/components/layout/NavUpgradeLink";
import { sidebarItemClasses, sidebarModuleClasses } from "@/components/layout/sidebar-nav-styles";
import {
  AGENCY_BRAIN_MODULE_REGISTRY,
  AGENCY_BRAIN_NAV_PILLARS,
  resolveAgencyBrainFeatures,
  type AgencyBrainFeatureFlags,
  type AgencyBrainModuleMeta
} from "@/lib/agency-brain/domain/modules";
import { agencyBrainModuleAllowed } from "@/lib/billing/nav-permissions";
import { isLabsEnabledForUser } from "@/lib/labs/feature-flag";

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

function moduleIsComingSoon(mod: AgencyBrainModuleMeta, isPlatformAdmin?: boolean): boolean {
  if (!mod.comingSoon) return false;
  if (mod.id === "labs") return !isLabsEnabledForUser(isPlatformAdmin);
  return true;
}

function ComingSoonModuleLink({
  mod,
  collapsed,
  onNavigate,
  label,
  soonLabel
}: {
  mod: AgencyBrainModuleMeta;
  collapsed: boolean;
  onNavigate?: () => void;
  label: string;
  soonLabel: string;
}) {
  if (collapsed) {
    return (
      <Link
        href={mod.route}
        title={`${label} — ${soonLabel}`}
        onClick={() => onNavigate?.()}
        className="flex justify-center rounded-lg px-2 py-1.5 text-slate-500 opacity-70 hover:bg-white/5"
      >
        <svg className="h-3.5 w-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      </Link>
    );
  }

  return (
    <Link
      href={mod.route}
      onClick={() => onNavigate?.()}
      className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-[12px] transition hover:bg-white/5 ${
        mod.navAccent === "pink" ? "text-pink-400/60 hover:text-pink-300/80" : "text-slate-500/70"
      }`}
    >
      <span className="truncate opacity-80">{label}</span>
      <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase text-slate-400">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        {soonLabel}
      </span>
    </Link>
  );
}

function LockedModuleLink({
  mod,
  collapsed,
  onNavigate,
  label
}: {
  mod: AgencyBrainModuleMeta;
  collapsed: boolean;
  onNavigate?: () => void;
  label: string;
}) {
  if (collapsed) {
    return (
      <Link
        href="/billing"
        title={`${label} — upgrade`}
        onClick={() => onNavigate?.()}
        className="flex justify-center rounded-lg px-2 py-1.5 text-slate-500 opacity-60 hover:bg-white/5"
      >
        <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      </Link>
    );
  }

  return (
    <Link
      href="/billing"
      onClick={() => onNavigate?.()}
      className="flex items-center justify-between rounded-lg px-3 py-1.5 text-[12px] text-slate-500/70 transition hover:bg-white/5"
    >
      <span className="truncate opacity-70">{label}</span>
      <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase text-amber-400">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </Link>
  );
}

export function AgencyBrainNavGroup({
  collapsed,
  agencyBrainFeatures,
  pathname,
  permissionsReady = true,
  isPlatformAdmin = false,
  onNavigate
}: Props) {
  const t = useTranslations("nav");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  const inAgencyBrain = base.startsWith("/agency-brain");

  const features = resolveAgencyBrainFeatures(agencyBrainFeatures);
  const flatModules = AGENCY_BRAIN_NAV_PILLARS.flatMap((pillar) =>
    AGENCY_BRAIN_MODULE_REGISTRY.filter((m) => m.navPillar === pillar)
  );

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

  const parentActive = inAgencyBrain;

  function subActive(mod: AgencyBrainModuleMeta) {
    return base === mod.route || base.startsWith(`${mod.route}/`);
  }

  if (collapsed) {
    return (
      <Link
        href="/agency-brain/suggestions"
        title={t("agencyBrainActionCenter")}
        onClick={() => onNavigate?.()}
        className={sidebarItemClasses(parentActive, true)}
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
        className={sidebarItemClasses(parentActive)}
      >
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
          {flatModules.map((mod) => {
            const label = t(mod.navKey);
            if (moduleIsComingSoon(mod, isPlatformAdmin)) {
              return (
                <ComingSoonModuleLink
                  key={mod.id}
                  mod={mod}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  label={label}
                  soonLabel={t("agencyBrainComingSoon")}
                />
              );
            }
            const allowed =
              (mod.id === "labs" && isPlatformAdmin) ||
              !permissionsReady ||
              agencyBrainModuleAllowed(mod, features);
            if (!allowed) {
              return (
                <LockedModuleLink
                  key={mod.id}
                  mod={mod}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  label={label}
                />
              );
            }
            const active = subActive(mod);
            return (
              <Link
                key={mod.id}
                href={mod.route}
                onClick={() => onNavigate?.()}
                className={sidebarModuleClasses(mod.navAccent, active)}
              >
                {label}
              </Link>
            );
          })}
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
