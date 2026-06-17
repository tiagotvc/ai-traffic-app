"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function NavUpgradeLink({
  label,
  collapsed,
  active,
  icon,
  onNavigate
}: {
  label: string;
  collapsed: boolean;
  active?: boolean;
  icon: React.ReactNode;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");

  const cls = `relative flex w-full items-center rounded-xl transition ${
    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2 text-[13px]"
  } ${
    active
      ? "bg-white/5 font-medium text-slate-500"
      : "font-medium text-slate-500/80 hover:bg-white/5 hover:text-slate-400"
  }`;

  return (
    <Link
      href="/billing"
      title={collapsed ? `${label} — ${t("upgradeRequired")}` : undefined}
      className={cls}
      onClick={() => onNavigate?.()}
    >
      <span className="opacity-50">{icon}</span>
      {!collapsed ? (
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left">
          <span className="truncate opacity-70">{label}</span>
          <svg
            className="h-3.5 w-3.5 shrink-0 text-amber-400/90"
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
          <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
            {t("upgrade")}
          </span>
        </span>
      ) : (
        <span className="absolute bottom-1 right-1 text-amber-400">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </Link>
  );
}
