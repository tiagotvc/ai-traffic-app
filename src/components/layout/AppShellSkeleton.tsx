"use client";

import { Suspense, useEffect, useRef, useState } from "react";

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
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
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

  return (
    <PublishPanelProvider>
      <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
        <AppSidebar
          userName={userName}
          userEmail={userEmail}
          alertCount={alertCount}
          planName={planName}
          planSlug={planSlug}
          subscriptionStatus={subscriptionStatus}
          allowCreativeMemoryAi={allowCreativeMemoryAi}
          agencyBrainFeatures={agencyBrainFeatures}
          isPlatformAdmin={platformAdmin}
          collapsed={ready ? collapsed : false}
          onToggleCollapse={toggleCollapsed}
        />
        <main
          ref={mainRef}
          onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 400)}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
        >
          <BillingGateModal planSlug={planSlug} status={subscriptionStatus} />
          <div className="mx-auto w-full max-w-[1600px] px-6 py-6 lg:px-8 lg:py-7">{children}</div>
        </main>

        {showTop ? (
          <button
            type="button"
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Voltar ao topo"
            className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition hover:bg-violet-700 print:hidden"
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
