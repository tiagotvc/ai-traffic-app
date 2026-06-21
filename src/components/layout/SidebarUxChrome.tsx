"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronLeft, ChevronRight, Globe, Info, LifeBuoy, LogOut, Moon, Receipt, RotateCcw, ScrollText, Settings, Shield, Sun, Ticket, Users, Wallet, Zap } from "lucide-react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  isPlatformAdminLinkActive,
  PLATFORM_ADMIN_LINKS
} from "@/components/layout/admin-nav-links";
import { routing, type AppLocale } from "@/i18n/routing";
import { useTheme } from "@/uxpilot-ui/adapters/ThemeProvider";

const LOCALE_LABELS: Record<AppLocale, string> = {
  "pt-BR": "PT-BR",
  en: "EN"
};

export function SidebarThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={collapsed ? "flex justify-center px-3 pb-2" : "px-3 pb-2"}>
      <button
        type="button"
        onClick={toggleTheme}
        title={isLight ? "Modo Escuro" : "Modo Claro"}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-body text-xs font-medium transition-all ${
          collapsed ? "justify-center px-2" : "w-full"
        }`}
        style={{
          background: "rgba(255,255,255,0.05)",
          borderColor: "rgba(255,255,255,0.08)",
          color: "#94a3b8"
        }}
      >
        {isLight ? <Moon size={14} style={{ color: "#f5a623" }} /> : <Sun size={14} style={{ color: "#f5a623" }} />}
        {!collapsed ? <span>{isLight ? "Modo Escuro" : "Modo Claro"}</span> : null}
      </button>
    </div>
  );
}

export function SidebarLanguageSelector({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function pick(next: AppLocale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    router.replace(pathname, { locale: next });
    setOpen(false);
  }

  return (
    <div className={`relative ${collapsed ? "flex justify-center px-3 pb-1" : "px-3 pb-1"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("language")}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-body text-xs font-medium transition-all ${
          collapsed ? "justify-center px-2" : "w-full justify-between"
        }`}
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: open ? "rgba(245,166,35,0.5)" : "rgba(255,255,255,0.08)",
          color: "#94a3b8"
        }}
      >
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: "#f5a623" }} />
          {!collapsed ? <span>{LOCALE_LABELS[locale]}</span> : null}
        </div>
        {!collapsed ? (
          <ChevronDown
            size={11}
            style={{
              color: "#64748b",
              transform: open ? "rotate(180deg)" : undefined,
              transition: "transform 0.2s"
            }}
          />
        ) : null}
      </button>

      {open && !collapsed ? (
        <div
          className="absolute bottom-full left-3 right-3 z-50 mb-1 overflow-hidden rounded-lg border shadow-xl"
          style={{ background: "#0d1520", borderColor: "rgba(255,255,255,0.1)" }}
        >
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => pick(loc)}
              className="flex w-full items-center justify-between px-3 py-2 font-body text-xs transition-colors"
              style={{
                color: locale === loc ? "#f5a623" : "#94a3b8",
                background: locale === loc ? "rgba(245,166,35,0.08)" : "transparent"
              }}
              onMouseEnter={(e) => {
                if (locale !== loc) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (locale !== loc) e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{LOCALE_LABELS[loc]}</span>
              {locale === loc ? <span style={{ color: "#f5a623", fontSize: 10 }}>✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {open && collapsed ? (
        <div
          className="absolute bottom-0 left-full z-50 ml-2 w-24 overflow-hidden rounded-lg border shadow-xl"
          style={{ background: "#0d1520", borderColor: "rgba(255,255,255,0.1)" }}
        >
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => pick(loc)}
              className="w-full px-3 py-2 text-left font-body text-xs transition-colors"
              style={{
                color: locale === loc ? "#f5a623" : "#94a3b8",
                background: locale === loc ? "rgba(245,166,35,0.08)" : "transparent"
              }}
            >
              {LOCALE_LABELS[loc]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarCollapseFab({
  collapsed,
  onToggle
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (!collapsed) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute -right-3 top-20 z-40 flex h-6 w-6 items-center justify-center rounded-full border transition-colors"
      style={{ background: "#1d2630", borderColor: "rgba(255,255,255,0.05)", color: "#94a3b8" }}
    >
      <ChevronRight size={12} />
    </button>
  );
}

export function SidebarLogoIcon() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg animate-pulse-violet"
      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
    >
      <Zap size={16} className="text-white" />
    </div>
  );
}

export function SidebarCollapseButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/5"
      style={{ color: "#94a3b8" }}
    >
      <ChevronLeft size={14} />
    </button>
  );
}

export function SidebarUserBlock({
  userName,
  subtitle,
  collapsed,
  isPlatformAdmin = false,
  onNavigate,
  onSignOut,
  signingOut
}: {
  userName: string;
  subtitle: string;
  collapsed: boolean;
  isPlatformAdmin?: boolean;
  onNavigate?: () => void;
  onSignOut: () => void;
  signingOut?: boolean;
}) {
  const tNav = useTranslations("nav");
  const tAdmin = useTranslations("billingAdmin");
  const tCommon = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = userName.trim().charAt(0).toUpperCase() || "?";
  const isLight = theme === "light";

  function closeAndNavigate() {
    setMenuOpen(false);
    onNavigate?.();
  }

  function pickLocale(next: AppLocale) {
    if (next !== locale) router.replace(pathname, { locale: next });
    setMenuOpen(false);
  }

  const menuLinkClass =
    "flex w-full items-center gap-2 px-3 py-2.5 font-body text-xs transition-colors hover:bg-white/[0.04]";

  const adminIcons = {
    users: Users,
    plans: Receipt,
    finance: Wallet,
    coupons: Ticket,
    refunds: RotateCcw
  } as const;

  function adminLinkStyle(active: boolean): React.CSSProperties {
    return {
      color: active ? "#f5a623" : "#94a3b8",
      background: active ? "rgba(245,166,35,0.08)" : "transparent"
    };
  }

  return (
    <div
      className={`relative shrink-0 ${collapsed ? "flex justify-center p-3" : "p-3"}`}
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={`flex items-center text-left transition-opacity hover:opacity-90 ${collapsed ? "" : "w-full gap-2"}`}
        title={userName}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-body text-xs font-semibold"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)",
            color: "#f8fafc"
          }}
        >
          {initial}
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-xs font-medium" style={{ color: "#f8fafc" }}>
              {userName}
            </p>
            <p className="truncate font-body text-[10px]" style={{ color: "#94a3b8" }}>
              {subtitle}
            </p>
          </div>
        ) : null}
      </button>

      {menuOpen ? (
        <div
          className={`absolute z-50 overflow-hidden rounded-lg border shadow-xl ${
            collapsed ? "bottom-full left-full mb-0 ml-2 w-56" : "bottom-full left-3 right-3 mb-1"
          }`}
          style={{ background: "#0d1520", borderColor: "rgba(255,255,255,0.1)" }}
        >
          <Link href="/settings" onClick={closeAndNavigate} className={menuLinkClass} style={{ color: "#94a3b8" }}>
            <Settings size={13} style={{ color: "#f5a623" }} />
            {tNav("myProfile")}
          </Link>
          <Link href="/billing" onClick={closeAndNavigate} className={menuLinkClass} style={{ color: "#94a3b8" }}>
            <Receipt size={13} style={{ color: "#f5a623" }} />
            {tNav("billing")}
          </Link>
          <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
          <Link href="/support" onClick={closeAndNavigate} className={menuLinkClass} style={{ color: "#94a3b8" }}>
            <LifeBuoy size={13} style={{ color: "#f5a623" }} />
            {tNav("support")}
          </Link>
          <Link href="/about" onClick={closeAndNavigate} className={menuLinkClass} style={{ color: "#94a3b8" }}>
            <Info size={13} style={{ color: "#f5a623" }} />
            {tNav("about")}
          </Link>
          <Link href="/terms" onClick={closeAndNavigate} className={menuLinkClass} style={{ color: "#94a3b8" }}>
            <ScrollText size={13} style={{ color: "#f5a623" }} />
            {tNav("terms")}
          </Link>
          <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
          <div className="px-3 py-1.5">
            <p className="mb-1 font-body text-[10px] uppercase tracking-wide" style={{ color: "#64748b" }}>
              {tCommon("language")}
            </p>
            <div className="flex gap-1">
              {routing.locales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => pickLocale(loc)}
                  className="flex-1 rounded-md px-2 py-1 font-body text-[10px] font-semibold transition-colors"
                  style={{
                    background: locale === loc ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.04)",
                    color: locale === loc ? "#f5a623" : "#94a3b8"
                  }}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              setMenuOpen(false);
            }}
            className={menuLinkClass}
            style={{ color: "#94a3b8" }}
          >
            {isLight ? <Moon size={13} style={{ color: "#f5a623" }} /> : <Sun size={13} style={{ color: "#f5a623" }} />}
            {isLight ? "Modo Escuro" : "Modo Claro"}
          </button>
          {isPlatformAdmin ? (
            <>
              <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
              <div className="px-3 py-1.5">
                <p className="mb-1 flex items-center gap-1.5 font-body text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
                  <Shield size={11} style={{ color: "#f5a623" }} />
                  {tNav("profileAdminSection")}
                </p>
                <div className="space-y-0.5">
                  {PLATFORM_ADMIN_LINKS.map((link) => {
                    const Icon = adminIcons[link.id as keyof typeof adminIcons];
                    const active = isPlatformAdminLinkActive(pathname, link.href);
                    return (
                      <Link
                        key={link.id}
                        href={link.href}
                        onClick={closeAndNavigate}
                        className={`${menuLinkClass} rounded-md`}
                        style={adminLinkStyle(active)}
                      >
                        <Icon size={13} style={{ color: active ? "#f5a623" : "#94a3b8" }} />
                        {tAdmin(link.labelKey)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
          <div className="my-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              setMenuOpen(false);
              onSignOut();
            }}
            className={`${menuLinkClass} disabled:opacity-60`}
            style={{ color: "#94a3b8" }}
          >
            <LogOut size={13} style={{ color: "#f5a623" }} />
            {signingOut ? tCommon("signingOut") : tCommon("signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
