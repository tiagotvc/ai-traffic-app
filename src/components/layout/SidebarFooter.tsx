"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function NavIcon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const settingsIcon =
  "M9.594 3.94c.09-.542.556-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.59 6.59 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.003-.827c.293-.24.438-.613.431-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.005-.828a1.125 1.125 0 01-.26-1.43l1.298-2.247a1.125 1.125 0 011.37-.491l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z";

function SettingsButton({
  onNavigate,
  title,
  className = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
}: {
  onNavigate?: () => void;
  title: string;
  className?: string;
}) {
  return (
    <Link
      href="/settings"
      onClick={() => onNavigate?.()}
      title={title}
      className={className}
    >
      <NavIcon d={settingsIcon} />
    </Link>
  );
}

export function SidebarFooter({
  userName,
  planName,
  subscriptionStatus,
  collapsed,
  onNavigate
}: {
  userName: string;
  planName?: string;
  subscriptionStatus?: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("sidebarFooter");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();

  const initial = userName.trim().charAt(0).toUpperCase() || "?";
  const billingWarning =
    subscriptionStatus === "past_due" || subscriptionStatus === "suspended";

  function signOut() {
    startSignOut(async () => {
      try {
        sessionStorage.removeItem("traffic-auto-sync-done");
      } catch {
        /* ignore */
      }
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
      router.replace("/login");
    });
  }

  if (collapsed) {
    return (
      <div className="relative shrink-0 space-y-2 border-t border-white/10 bg-[#0f111a] p-2">
        <Link
          href="/settings"
          title={userName}
          onClick={() => onNavigate?.()}
          className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white"
        >
          {initial}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0f111a] bg-emerald-400" />
        </Link>
        <div className="flex flex-col items-center gap-1.5">
          <LanguageSwitcher variant="sidebar" collapsed />
          <SettingsButton
            onNavigate={onNavigate}
            title={tNav("settings")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
          />
        </div>
        <button
          type="button"
          title={tCommon("signOut")}
          disabled={signingOut}
          onClick={signOut}
          className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-60"
        >
          <NavIcon d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative shrink-0 space-y-3 border-t border-white/10 bg-[#0f111a] p-3">
      <Link
        href="/settings"
        onClick={() => onNavigate?.()}
        className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition hover:bg-white/5"
      >
        <div className="relative shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
            {initial}
          </div>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0f111a] bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{userName}</div>
          <div className="truncate text-[11px] text-slate-500">
            {planName ?? tNav("planTitle")}
            {billingWarning ? <span className="ml-1 text-amber-400">!</span> : null}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <LanguageSwitcher variant="sidebar" collapsed={false} />
        </div>
        <SettingsButton onNavigate={onNavigate} title={tNav("settings")} />
      </div>

      <button
        type="button"
        disabled={signingOut}
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-slate-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-60"
      >
        <NavIcon d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        {signingOut ? tCommon("signingOut") : t("signOut")}
      </button>
    </div>
  );
}
