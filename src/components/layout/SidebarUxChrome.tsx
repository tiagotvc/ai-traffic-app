"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  LifeBuoy,
  LogOut,
  Megaphone,
  MessageCircle,
  Moon,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  User,
  X
} from "lucide-react";

import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";
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
        {isLight ? <Moon size={14} style={{ color: "var(--ui-accent)" }} /> : <Sun size={14} style={{ color: "var(--ui-accent)" }} />}
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
  const rootRef = useRef<HTMLDivElement>(null);

  useDismissOnOutsideClick(rootRef, open, () => setOpen(false));

  function pick(next: AppLocale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    router.replace(pathname, { locale: next });
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${collapsed ? "flex justify-center px-3 pb-1" : "px-3 pb-1"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("language")}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-body text-xs font-medium transition-all ${
          collapsed ? "justify-center px-2" : "w-full justify-between"
        }`}
        style={{
          background: "rgba(255,255,255,0.04)",
          borderColor: open ? "var(--ui-accent-border-strong)" : "rgba(255,255,255,0.08)",
          color: "#94a3b8"
        }}
      >
        <div className="flex items-center gap-2">
          <Globe size={14} style={{ color: "var(--ui-accent)" }} />
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
                color: locale === loc ? "var(--ui-accent)" : "#94a3b8",
                background: locale === loc ? "var(--ui-accent-muted)" : "transparent"
              }}
              onMouseEnter={(e) => {
                if (locale !== loc) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (locale !== loc) e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{LOCALE_LABELS[loc]}</span>
              {locale === loc ? <span style={{ color: "var(--ui-accent)", fontSize: 10 }}>✓</span> : null}
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
                color: locale === loc ? "var(--ui-accent)" : "#94a3b8",
                background: locale === loc ? "var(--ui-accent-muted)" : "transparent"
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

export function SidebarLogoIcon({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return <OrionAgencyLogo size="md" showText={false} variant="dark" className="orion-logo--sidebar-collapsed" />;
  }

  return <OrionAgencyLogo size="md" showText variant="dark" className="orion-logo--sidebar" />;
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
  userEmail,
  subtitle,
  collapsed,
  isPlatformAdmin = false,
  planName,
  onNavigate,
  onSignOut,
  signingOut,
  mobileFullScreen = false
}: {
  userName: string;
  userEmail?: string;
  subtitle: string;
  collapsed: boolean;
  isPlatformAdmin?: boolean;
  planName?: string;
  onNavigate?: () => void;
  onSignOut: () => void;
  signingOut?: boolean;
  mobileFullScreen?: boolean;
}) {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tBilling = useTranslations("billingPage");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = userName.trim().charAt(0).toUpperCase() || "?";
  const isLight = theme === "light";

  const [planLoading, setPlanLoading] = useState(false);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [planInfo, setPlanInfo] = useState<{
    name: string;
    cycle: string;
    status: string;
    renewal: string | null;
  } | null>(null);
  const [usageSummary, setUsageSummary] = useState<{ used: number; max: number } | null>(null);

  // Fecha o menu ao clicar fora (não aplica no modo full-screen mobile, que tem botão próprio).
  useDismissOnOutsideClick(rootRef, menuOpen && !mobileFullScreen, () => setMenuOpen(false));

  // Carrega o resumo da assinatura para o card do menu quando ele abre.
  useEffect(() => {
    if (!menuOpen || planLoaded) return;
    let active = true;
    setPlanLoading(true);
    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then((j) => {
        if (!active || !j?.ok) return;
        const s = j.subscription;
        if (s) {
          setPlanInfo({
            name: s.plan?.name ?? planName ?? "Free",
            cycle: s.billingCycle === "yearly" ? tNav("planCycleYearly") : tNav("planCycleMonthly"),
            status: s.status ?? "active",
            renewal: s.currentPeriodEnd
              ? new Date(s.currentPeriodEnd).toLocaleDateString(locale, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })
              : null
          });
        } else {
          setPlanInfo({
            name: planName ?? "Free",
            cycle: tNav("planCycleMonthly"),
            status: "active",
            renewal: null
          });
        }
        const usage = j.entitlements?.usage;
        const limits = j.entitlements?.limits;
        if (usage && limits && limits.maxClients > 0) {
          setUsageSummary({ used: usage.clients, max: limits.maxClients });
        } else if (usage && limits) {
          setUsageSummary(null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setPlanLoading(false);
          setPlanLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [menuOpen, planLoaded, planName, locale, tNav]);

  function closeAndNavigate() {
    setMenuOpen(false);
    onNavigate?.();
  }

  function pickLocale(next: AppLocale) {
    if (next !== locale) router.replace(pathname, { locale: next });
  }

  const sectionLabelClass =
    "px-3 pb-1 pt-3.5 font-body text-[10px] font-semibold uppercase tracking-wider text-[#64748b]";
  const itemClass =
    "flex w-full items-center gap-2.5 px-3 py-2 font-body text-[13px] text-[#cbd5e1] transition-colors hover:bg-white/[0.04]";

  function MenuLink({
    href,
    icon,
    label,
    external,
    right
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    external?: boolean;
    right?: React.ReactNode;
  }) {
    return (
      <Link href={href} onClick={closeAndNavigate} className={itemClass}>
        <span className="shrink-0 text-[#94a3b8]">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {right ??
          (external ? (
            <ExternalLink size={13} className="shrink-0 text-[#64748b]" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-[#64748b]" />
          ))}
      </Link>
    );
  }

  const usagePct =
    usageSummary && usageSummary.max > 0
      ? Math.min(100, Math.round((usageSummary.used / usageSummary.max) * 100))
      : 0;

  const menuPanel = (
    <>
      {/* Header — avatar + nome/email. No mobile, X fecha (volta pro drawer); no desktop, seta. */}
      <div className="flex items-center gap-3 px-3 pt-3">
        <Link
          href="/settings"
          onClick={closeAndNavigate}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-heading text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-sm font-semibold text-[#f8fafc]">{userName}</p>
            {userEmail ? (
              <p className="truncate font-body text-[11px] text-[#94a3b8]">{userEmail}</p>
            ) : null}
          </div>
        </Link>
        {mobileFullScreen ? (
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label={tNav("closeMenu", { defaultMessage: "Fechar" })}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#94a3b8] hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        ) : (
          <ChevronRight size={15} className="shrink-0 text-[#64748b]" />
        )}
      </div>
      {isPlatformAdmin ? (
        <div className="px-3 pt-1.5">
          <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(124,58,237,0.18)", color: "#a78bfa" }}>
            <ShieldCheck size={11} />
            {tNav("menuAdminBadge")}
          </span>
        </div>
      ) : null}

      {/* Plan card */}
      <div className="mx-3 mt-3 rounded-xl border p-3" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-body text-[13px] font-semibold text-[#f8fafc]">
              <Sparkles size={13} style={{ color: "var(--ui-accent)" }} />
              {planLoading ? (
                <span className="inline-block h-4 w-20 animate-pulse rounded bg-white/10" />
              ) : (
                planInfo?.name ?? planName ?? "—"
              )}
            </p>
            {planLoading ? (
              <div className="mt-1.5 h-3 w-28 animate-pulse rounded bg-white/10" />
            ) : planInfo ? (
              <p className="mt-0.5 flex items-center gap-1.5 font-body text-[11px] text-[#94a3b8]">
                {planInfo.cycle}
                <span className="text-[#475569]">•</span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: planInfo.status === "active" ? "#10b981" : "var(--ui-accent)" }}
                  />
                  {planInfo.status === "active" ? tBilling("statusActiveShort") : planInfo.status}
                </span>
              </p>
            ) : null}
          </div>
          {planLoading ? (
            <div className="shrink-0 space-y-1 text-right">
              <div className="ml-auto h-3 w-14 animate-pulse rounded bg-white/10" />
              <div className="ml-auto h-2 w-12 animate-pulse rounded bg-white/10" />
            </div>
          ) : planInfo?.renewal ? (
            <div className="shrink-0 text-right">
              <p className="font-body text-[11px] font-medium text-[#cbd5e1]">{planInfo.renewal}</p>
              <p className="font-body text-[10px] text-[#64748b]">{tNav("menuRenewal")}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          {planLoading ? (
            <div className="space-y-1.5">
              <div className="h-2 w-24 animate-pulse rounded bg-white/10" />
              <div className="h-1.5 w-full animate-pulse rounded-full bg-white/10" />
            </div>
          ) : usageSummary ? (
            <>
              <div className="mb-1 flex items-center justify-between font-body text-[10px] text-[#64748b]">
                <span>{tNav("menuPlanUsage")}</span>
                <span className="tabular-nums text-[#94a3b8]">
                  {usageSummary.used} / {usageSummary.max}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(usageSummary.used > 0 ? 4 : 0, usagePct)}%`,
                    background: "linear-gradient(90deg,#7c3aed,#a78bfa)"
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* CONTA */}
      <p className={sectionLabelClass}>{tNav("secAccount")}</p>
      <MenuLink href="/settings" icon={<User size={15} />} label={tNav("myProfile")} />
      <div className={itemClass}>
        <span className="shrink-0 text-[#94a3b8]">{isLight ? <Sun size={15} /> : <Moon size={15} />}</span>
        <span className="flex-1">{tNav("menuAppearance")}</span>
        <button
          type="button"
          onClick={() => toggleTheme()}
          className="flex items-center gap-0.5 rounded-full p-0.5"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label={tNav("menuAppearance")}
        >
          <span className="flex h-5 w-6 items-center justify-center rounded-full" style={{ background: !isLight ? "rgba(124,58,237,0.5)" : "transparent" }}>
            <Moon size={11} style={{ color: !isLight ? "#fff" : "#64748b" }} />
          </span>
          <span className="flex h-5 w-6 items-center justify-center rounded-full" style={{ background: isLight ? "var(--ui-accent-muted-strong)" : "transparent" }}>
            <Sun size={11} style={{ color: isLight ? "#fff" : "#64748b" }} />
          </span>
        </button>
      </div>
      <div className={itemClass}>
        <span className="shrink-0 text-[#94a3b8]"><Globe size={15} /></span>
        <span className="flex-1">{tNav("menuLanguage")}</span>
        <div className="flex shrink-0 items-center gap-1">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => pickLocale(loc)}
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
              style={{
                background: locale === loc ? "var(--ui-accent-muted)" : "transparent",
                color: locale === loc ? "var(--ui-accent)" : "#64748b"
              }}
            >
              {LOCALE_LABELS[loc]}
            </button>
          ))}
        </div>
      </div>

      {isPlatformAdmin ? (
        <>
          <p className={sectionLabelClass}>{tNav("secWorkspace")}</p>
          <MenuLink
            href="/admin/users"
            icon={<ShieldCheck size={15} />}
            label={tNav("menuAdministrative")}
          />
        </>
      ) : null}

      {/* AJUDA E SUPORTE */}
      <p className={sectionLabelClass}>{tNav("secHelp")}</p>
      <MenuLink href="/legal/support" icon={<LifeBuoy size={15} />} label={tNav("menuHelp")} external />
      <MenuLink
        href="/legal/about"
        icon={<Megaphone size={15} />}
        label={tNav("menuNews")}
        right={<span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "#7c3aed" }} />}
      />
      <MenuLink href="/legal/support" icon={<MessageCircle size={15} />} label={tNav("menuFeedback")} external />

      {/* EMPRESA */}
      <p className={sectionLabelClass}>{tNav("secCompany")}</p>
      <MenuLink href="/legal/terms" icon={<ScrollText size={15} />} label={tNav("terms")} external />
      <MenuLink href="/legal/privacy" icon={<Shield size={15} />} label={tNav("privacy")} external />
      <MenuLink href="/legal/data-deletion" icon={<Trash2 size={15} />} label={tNav("dataDeletion")} />
    </>
  );

  const accountFooterClass = `sidebar-account-footer ${
    collapsed ? "sidebar-account-footer--collapsed" : "sidebar-account-footer--expanded"
  }`;

  const signOutFooter = (
    <div className={accountFooterClass}>
      <button
        type="button"
        disabled={signingOut}
        onClick={() => {
          setMenuOpen(false);
          onSignOut();
        }}
        className="sidebar-account-footer__sign-out-btn font-body"
      >
        <LogOut size={15} />
        {signingOut ? tCommon("signingOut") : tNav("menuSignOutAccount")}
      </button>
    </div>
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div className={accountFooterClass}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex items-center text-left transition-all hover:opacity-95 ${
            collapsed
              ? ""
              : "w-full gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2"
          }`}
          title={userName}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-body text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            {initial}
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-[13px] font-medium text-[#f8fafc]">{userName}</p>
                <p className="truncate font-body text-[11px] text-[#94a3b8]">
                  {isPlatformAdmin ? tNav("userRoleAdmin") : subtitle}
                </p>
              </div>
              <ChevronRight size={15} className="shrink-0 text-[#64748b]" aria-hidden />
            </>
          ) : null}
        </button>
      </div>

      {menuOpen ? (
        mobileFullScreen ? (
          <div className="fixed inset-0 z-[70] flex flex-col bg-[#0a0f14] pt-[env(safe-area-inset-top)]">
            <div className="min-h-0 flex-1 overflow-y-auto">{menuPanel}</div>
            {signOutFooter}
          </div>
        ) : (
          <div
            className={`sidebar-account-panel fixed z-50 flex w-72 flex-col overflow-hidden rounded-r-xl border border-l-0 shadow-2xl ${
              collapsed ? "left-16" : "left-60"
            }`}
            style={{ background: "#0a0f14", borderColor: "var(--sidebar-border)" }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">{menuPanel}</div>
            {signOutFooter}
          </div>
        )
      ) : null}
    </div>
  );
}
