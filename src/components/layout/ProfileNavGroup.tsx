"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "profile-nav-expanded";

const profileIcon =
  "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z";

const BASIC_LINKS = [
  { id: "billing", href: "/billing", labelKey: "billing" as const },
  { id: "settings", href: "/settings", labelKey: "settings" as const }
] as const;

const ADMIN_LINKS = [
  { id: "users", href: "/admin/users", labelKey: "navUsers" as const },
  { id: "plans", href: "/admin/billing/plans", labelKey: "navPlans" as const },
  { id: "finance", href: "/admin/billing/finance", labelKey: "navFinance" as const },
  { id: "coupons", href: "/admin/billing/coupons", labelKey: "navCoupons" as const },
  { id: "refunds", href: "/admin/billing/refunds", labelKey: "navRefunds" as const }
] as const;

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

function subLinkClasses(active: boolean): string {
  return `block rounded-lg px-3 py-1.5 text-[12px] transition ${
    active
      ? "bg-violet-500/20 font-semibold text-violet-200"
      : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
  }`;
}

type Props = {
  collapsed: boolean;
  pathname: string;
  isPlatformAdmin?: boolean;
  onNavigate?: () => void;
};

export function ProfileNavGroup({ collapsed, pathname, isPlatformAdmin = false, onNavigate }: Props) {
  const t = useTranslations("nav");
  const tAdmin = useTranslations("billingAdmin");
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";

  const inProfile =
    base === "/billing" ||
    base.startsWith("/billing/") ||
    base === "/settings" ||
    base.startsWith("/settings/") ||
    base.startsWith("/admin/");

  const [expanded, setExpanded] = useState(inProfile);

  useEffect(() => {
    if (inProfile) setExpanded(true);
  }, [inProfile]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setExpanded(true);
      if (stored === "false" && !inProfile) setExpanded(false);
    } catch {
      /* ignore */
    }
  }, [inProfile]);

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
    if (href === "/admin/users") return base.startsWith("/admin/users");
    return base === href || base.startsWith(`${href}/`);
  }

  if (collapsed) {
    return (
      <Link
        href="/settings"
        title={t("profile")}
        onClick={() => onNavigate?.()}
        className={`relative flex w-full items-center justify-center rounded-xl px-0 py-2.5 transition ${
          inProfile
            ? "bg-white/10 font-semibold text-white"
            : "font-medium text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <NavIcon d={profileIcon} />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={toggleExpanded}
        className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition ${
          inProfile
            ? "bg-white/10 font-semibold text-white"
            : "font-medium text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        {inProfile ? (
          <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-violet-600" />
        ) : null}
        <NavIcon d={profileIcon} />
        <span className="min-w-0 flex-1 truncate text-left">{t("profile")}</span>
        <NavIcon d={expanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
      </button>

      {expanded ? (
        <div className="ml-4 space-y-0.5 border-l border-white/10 pl-2">
          {BASIC_LINKS.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              onClick={() => onNavigate?.()}
              className={subLinkClasses(isLinkActive(link.href))}
            >
              {t(link.labelKey)}
            </Link>
          ))}

          {isPlatformAdmin ? (
            <>
              <p className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {t("profileAdminSection")}
              </p>
              {ADMIN_LINKS.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => onNavigate?.()}
                  className={subLinkClasses(isLinkActive(link.href))}
                >
                  {tAdmin(link.labelKey)}
                </Link>
              ))}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
