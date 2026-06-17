"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { PublishPanelHost } from "@/components/publish/PublishPanelHost";
import { PublishPanelProvider } from "@/components/publish/PublishPanelContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BillingGateModal } from "@/components/billing/BillingGateModal";
import type { AgencyBrainFeatureFlags } from "@/lib/agency-brain/domain/modules";

const STORAGE_KEY = "traffic-ai-sidebar-collapsed";
const HEARTBEAT_KEY = "traffic-ai-heartbeat";

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
  alertCount: number,
  planName: string,
  planSlug: string,
  subscriptionStatus: string,
  allowCreativeMemoryAi: boolean,
  agencyBrainFeatures: AgencyBrainFeatureFlags,
  platformAdmin: boolean,
  collapsed: boolean,
  onToggleCollapse: () => void,
  extra?: { variant?: "sidebar" | "drawer"; onNavigate?: () => void }
) {
  return {
    userName,
    userEmail,
    alertCount,
    planName,
    planSlug,
    subscriptionStatus,
    allowCreativeMemoryAi,
    agencyBrainFeatures,
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

  const [alertCount, setAlertCount] = useState(0);
  const [planSlug, setPlanSlug] = useState("free");
  const [planName, setPlanName] = useState("Free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [allowCreativeMemoryAi, setAllowCreativeMemoryAi] = useState(true);
  const [agencyBrainFeatures, setAgencyBrainFeatures] =
    useState<AgencyBrainFeatureFlags>(DEFAULT_BRAIN_FEATURES);
  const [platformAdmin, setPlatformAdmin] = useState(isPlatformAdmin);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/alerts/count")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.count != null) setAlertCount(Number(j.count) || 0);
      })
      .catch(() => {});

    void fetch("/api/me/entitlements")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.entitlements) return;
        const e = j.entitlements as {
          planSlug?: string;
          planName?: string;
          status?: string;
          limits?: AgencyBrainFeatureFlags & { allowCreativeMemoryAi?: boolean };
        };
        setPlanSlug(e.planSlug ?? "free");
        setPlanName(e.planName ?? "Free");
        setSubscriptionStatus(e.status ?? "active");
        const limits = e.limits;
        if (limits) {
          setAllowCreativeMemoryAi(limits.allowCreativeMemoryAi ?? true);
          setAgencyBrainFeatures({
            allowCreativeMemoryAi: limits.allowCreativeMemoryAi ?? true,
            allowAgencyBrainHypotheses: limits.allowAgencyBrainHypotheses ?? true,
            allowAgencyBrainDna: limits.allowAgencyBrainDna ?? true,
            allowAgencyBrainTimeline: limits.allowAgencyBrainTimeline ?? false,
            allowAgencyBrainExperiments: limits.allowAgencyBrainExperiments ?? false,
            allowAgencyBrainActionPlans: limits.allowAgencyBrainActionPlans ?? false,
            allowAgencyBrainChat: limits.allowAgencyBrainChat ?? false
          });
        }
        if (j.isPlatformAdmin != null) setPlatformAdmin(!!j.isPlatformAdmin);
      })
      .catch(() => {});

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
      cancelled = true;
    };
  }, []);

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
    alertCount,
    planName,
    planSlug,
    subscriptionStatus,
    allowCreativeMemoryAi,
    agencyBrainFeatures,
    platformAdmin,
    ready ? collapsed : false,
    toggleCollapsed
  );

  return (
    <PublishPanelProvider>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f4f6f9] lg:flex-row">
        {/* Mobile top bar */}
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-3 lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label={t("openMenu", { defaultMessage: "Abrir menu" })}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {alertCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            ) : null}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">
              ∞
            </div>
            <span className="truncate text-sm font-semibold text-slate-900">Traffic AI</span>
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
              <div className="flex shrink-0 items-center justify-end border-b border-white/10 bg-[#0f111a] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
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

        {showTop ? (
          <button
            type="button"
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Voltar ao topo"
            className="fixed bottom-5 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition hover:bg-violet-700 print:hidden lg:bottom-6 lg:right-6"
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
  );
}
