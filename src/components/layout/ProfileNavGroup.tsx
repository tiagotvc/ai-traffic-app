"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { sidebarItemClasses, sidebarSubLinkClasses } from "@/components/layout/sidebar-nav-styles";
import {
  isPlatformAdminLinkActive,
  PLATFORM_ADMIN_LINKS
} from "@/components/layout/admin-nav-links";

const STORAGE_KEY = "settings-nav-expanded";

const profileIcon =
  "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z";

const settingsIcon =
  "M9.594 3.94c.09-.542.556-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.59 6.59 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.003-.827c.293-.24.438-.613.431-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.005-.828a1.125 1.125 0 01-.26-1.43l1.298-2.247a1.125 1.125 0 011.37-.491l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z";

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

type Props = {
  collapsed: boolean;
  pathname: string;
  isPlatformAdmin?: boolean;
  onNavigate?: () => void;
};

function isProfileRoute(base: string): boolean {
  return (
    base === "/settings" ||
    base.startsWith("/settings/") ||
    base === "/billing" ||
    base.startsWith("/billing/")
  );
}

export function ProfileNavGroup({ collapsed, pathname, isPlatformAdmin = false, onNavigate }: Props) {
  const t = useTranslations("nav");
  const tAdmin = useTranslations("billingAdmin");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";

  const inProfile = isProfileRoute(base);
  const inAdmin = base.startsWith("/admin/");
  const inSection = inProfile || inAdmin;

  const [expanded, setExpanded] = useState(inSection);

  useEffect(() => {
    if (inSection) setExpanded(true);
  }, [inSection]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setExpanded(true);
      if (stored === "false" && !inSection) setExpanded(false);
    } catch {
      /* ignore */
    }
  }, [inSection]);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }

  function isLinkActive(href: string): boolean {
    return isPlatformAdminLinkActive(pathname, href);
  }

  if (!isPlatformAdmin) {
    return (
      <Link
        href="/settings"
        title={t("profile")}
        onClick={() => onNavigate?.()}
        className={sidebarItemClasses(inProfile, collapsed)}
      >
        <NavIcon d={profileIcon} />
        {!collapsed ? <span className="min-w-0 flex-1 truncate text-left">{t("profile")}</span> : null}
      </Link>
    );
  }

  if (collapsed) {
    return (
      <Link
        href="/settings"
        title={t("settings")}
        onClick={() => onNavigate?.()}
        className={sidebarItemClasses(inSection, true)}
      >
        <NavIcon d={settingsIcon} />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <button type="button" onClick={toggleExpanded} className={sidebarItemClasses(inSection)}>
        <NavIcon d={settingsIcon} />
        <span className="min-w-0 flex-1 truncate text-left">{t("settings")}</span>
        <NavIcon d={expanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
      </button>

      {expanded ? (
        <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
          <Link
            href="/settings"
            onClick={() => onNavigate?.()}
            className={sidebarSubLinkClasses(inProfile && !inAdmin)}
          >
            {t("myProfile")}
          </Link>

          <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
            {t("profileAdminSection")}
          </p>
          {PLATFORM_ADMIN_LINKS.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              onClick={() => onNavigate?.()}
              className={sidebarSubLinkClasses(isLinkActive(link.href))}
            >
              {tAdmin(link.labelKey)}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
