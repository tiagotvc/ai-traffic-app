"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { PublishPanelHost } from "@/components/publish/PublishPanelHost";
import { PublishPanelProvider } from "@/components/publish/PublishPanelContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CommandStripProvider } from "@/components/layout/CommandStripContext";
import { BillingGateModal } from "@/components/billing/BillingGateModal";
import { UxThemeProvider } from "@/uxpilot-ui/adapters/ThemeProvider";
import type { AgencyBrainFeatureFlags } from "@/lib/agency-brain/domain/modules";
import type { PlanLimits } from "@/lib/billing/types";
import { FREE_LIMITS } from "@/lib/billing/types";

const STORAGE_KEY = "traffic-ai-sidebar-collapsed";
const HEARTBEAT_KEY = "traffic-ai-heartbeat";
const ENTITLEMENTS_CACHE_KEY = "traffic-ai-shell-entitlements";

type CachedEntitlements = {
  planSlug: string;
  planName: string;
  subscriptionStatus: string;
  limits: PlanLimits;
  isPlatformAdmin?: boolean;
};

function readEntitlementsCache(): CachedEntitlements | null {
  try {
    const raw = sessionStorage.getItem(ENTITLEMENTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntitlements;
    if (!parsed?.limits) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeEntitlementsCache(data: CachedEntitlements) {
  try {
    sessionStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function limitsToBrainFeatures(limits: PlanLimits): AgencyBrainFeatureFlags {
  return {
    allowCreativeMemoryAi: limits.allowCreativeMemoryAi ?? true,
    allowAgencyBrainHypotheses: limits.allowAgencyBrainHypotheses ?? true,
    allowAgencyBrainDna: limits.allowAgencyBrainDna ?? true,
    allowAgencyBrainTimeline: limits.allowAgencyBrainTimeline ?? false,
    allowAgencyBrainExperiments: limits.allowAgencyBrainExperiments ?? false,
    allowAgencyBrainActionPlans: limits.allowAgencyBrainActionPlans ?? false,
    allowAgencyBrainChat: limits.allowAgencyBrainChat ?? false
  };
}

const DEFAULT_BRAIN_FEATURES: AgencyBrainFeatureFlags = {
  allowCreativeMemoryAi: true,
  allowAgencyBrainHypotheses: true,
  allowAgencyBrainDna: true,
  allowAgencyBrainTimeline: false,
  allowAgencyBrainExperiments: false,
  allowAgencyBrainActionPlans: false,
  allowAgencyBrainChat: false
};

function sidebarProps(
  userName: string,
  userEmail: string,
  planName: string,
  planSlug: string,
  subscriptionStatus: string,
  allowCreativeMemoryAi: boolean,
  agencyBrainFeatures: AgencyBrainFeatureFlags,
  planLimits: PlanLimits,
  planLimitsReady: boolean,
  platformAdmin: boolean,
  collapsed: boolean,
  onToggleCollapse: () => void,
  extra?: { variant?: "sidebar" | "drawer"; onNavigate?: () => void }
) {
  return {
    userName,
    userEmail,
    planName,
    planSlug,
    subscriptionStatus,
    allowCreativeMemoryAi,
    agencyBrainFeatures,
    planLimits,
    planLimitsReady,
    isPlatformAdmin: platformAdmin,
    collapsed,
    onToggleCollapse,
    ...extra
  };
}

export function AppShellSkeleton({
  children,
  userName,
  userEmail,
  isPlatformAdmin = false
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  isPlatformAdmin?: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [showTop, setShowTop] = useState(false);

  const [planSlug, setPlanSlug] = useState("free");
  const [planName, setPlanName] = useState("Free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [allowCreativeMemoryAi, setAllowCreativeMemoryAi] = useState(true);
  const [agencyBrainFeatures, setAgencyBrainFeatures] =
    useState<AgencyBrainFeatureFlags>(DEFAULT_BRAIN_FEATURES);
  const [planLimits, setPlanLimits] = useState<PlanLimits>(FREE_LIMITS);
  const [planLimitsReady, setPlanLimitsReady] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(isPlatformAdmin);

  const applyEntitlements = useCallback((e: CachedEntitlements) => {
    setPlanSlug(e.planSlug);
    setPlanName(e.planName);
    setSubscriptionStatus(e.subscriptionStatus);
    setPlanLimits(e.limits);
    setAllowCreativeMemoryAi(e.limits.allowCreativeMemoryAi ?? true);
    setAgencyBrainFeatures(limitsToBrainFeatures(e.limits));
    if (e.isPlatformAdmin != null) setPlatformAdmin(!!e.isPlatformAdmin);
  }, []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const cached = readEntitlementsCache();
    if (cached) {
      applyEntitlements(cached);
      setPlanLimitsReady(true);
    }
  }, [applyEntitlements]);

  useEffect(() => {
    setPlatformAdmin(isPlatformAdmin);
  }, [isPlatformAdmin]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const loadShellData = useCallback(() => {
    void fetch(`/api/me/entitlements?fresh=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.entitlements) return;
        const e = j.entitlements as {
          planSlug?: string;
          planName?: string;
          status?: string;
          limits?: PlanLimits;
        };
        const limits = e.limits;
        if (!limits) return;

        const cached: CachedEntitlements = {
          planSlug: e.planSlug ?? "free",
          planName: e.planName ?? "Free",
          subscriptionStatus: e.status ?? "active",
          limits,
          isPlatformAdmin: j.isPlatformAdmin != null ? !!j.isPlatformAdmin : undefined
        };
        applyEntitlements(cached);
        writeEntitlementsCache(cached);
      })
      .catch(() => {})
      .finally(() => setPlanLimitsReady(true));
  }, [applyEntitlements]);

  useEffect(() => {
    loadShellData();

    const onEntitlementsChanged = () => loadShellData();
    window.addEventListener("traffic:entitlements-changed", onEntitlementsChanged);

    try {
      if (sessionStorage.getItem(HEARTBEAT_KEY) !== "1") {
        void fetch("/api/me/heartbeat", { method: "POST" })
          .then(() => {
            try {
              sessionStorage.setItem(HEARTBEAT_KEY, "1");
            } catch {
              /* ignore */
            }
          })
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener("traffic:entitlements-changed", onEntitlementsChanged);
    };
  }, [loadShellData]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const sharedSidebar = sidebarProps(
    userName,
    userEmail,
    planName,
    planSlug,
    subscriptionStatus,
    allowCreativeMemoryAi,
    agencyBrainFeatures,
    planLimits,
    planLimitsReady,
    platformAdmin,
    ready ? collapsed : false,
    toggleCollapsed
  );

  return (
    <UxThemeProvider>
    <PublishPanelProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--surface-bg)] lg:flex-row">
        {/* Mobile top bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border-color)] bg-[var(--surface-card)] px-4 py-3 lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-dim)] hover:bg-[var(--row-hover)]"
            aria-label={t("openMenu", { defaultMessage: "Abrir menu" })}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              ∞
            </div>
            <span className="truncate font-heading text-sm font-semibold text-[var(--text-main)]">Orion Agency</span>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden print:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label={t("closeMenu", { defaultMessage: "Fechar menu" })}
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(300px,88vw)] max-w-full flex-col shadow-2xl">
              <div className="flex shrink-0 items-center justify-end border-b border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-white/10 hover:text-white"
                  aria-label={t("closeMenu", { defaultMessage: "Fechar menu" })}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <AppSidebar
                  {...sharedSidebar}
                  variant="drawer"
                  collapsed={false}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Desktop sidebar */}
        <div className="hidden h-full shrink-0 lg:flex print:hidden">
          <AppSidebar {...sharedSidebar} />
        </div>

        <CommandStripProvider>
          <main
            ref={mainRef}
            onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 400)}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
          >
            <BillingGateModal planSlug={planSlug} status={subscriptionStatus} />
            <div className="w-full px-4 py-4 sm:px-5 md:px-6 lg:mx-auto lg:max-w-[1600px] lg:px-8 lg:py-7">
              {children}
            </div>
          </main>
        </CommandStripProvider>

        {showTop ? (
          <button
            type="button"
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Voltar ao topo"
            className="fixed bottom-5 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full text-[#0f1419] shadow-lg transition print:hidden lg:bottom-6 lg:right-6"
            style={{ background: "linear-gradient(135deg, var(--amber-bright), #e8920d)" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </button>
        ) : null}
      </div>
      <Suspense fallback={null}>
        <PublishPanelHost onPublished={() => window.dispatchEvent(new Event("traffic:campaigns-reload"))} />
      </Suspense>
    </PublishPanelProvider>
    </UxThemeProvider>
  );
}
