"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import { PublishPanelHost } from "@/components/publish/PublishPanelHost";
import { PublishPanelProvider } from "@/components/publish/PublishPanelContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { CommandStripProvider } from "@/components/layout/CommandStripContext";
import { BillingGateModal } from "@/components/billing/BillingGateModal";
import { FirstLoginTermsGate } from "@/components/auth/FirstLoginTermsGate";
import { UxThemeProvider } from "@/uxpilot-ui/adapters/ThemeProvider";
import { ThemeConfigApplier } from "@/components/theme/ThemeConfigApplier";
import type { AgencyBrainFeatureFlags } from "@/lib/agency-brain/domain/modules";

const STORAGE_KEY = "traffic-ai-sidebar-collapsed";

export function AppShell({
  children,
  userName,
  userEmail,
  planSlug = "free",
  planName = "Free",
  subscriptionStatus = "active",
  allowCreativeMemoryAi = true,
  agencyBrainFeatures,
  isPlatformAdmin = false
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  planSlug?: string;
  planName?: string;
  subscriptionStatus?: string;
  allowCreativeMemoryAi?: boolean;
  agencyBrainFeatures?: AgencyBrainFeatureFlags;
  isPlatformAdmin?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
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
    <UxThemeProvider>
    <ThemeConfigApplier />
    <PublishPanelProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--surface-bg)]">
        <AppSidebar
          userName={userName}
          userEmail={userEmail}
          planName={planName}
          planSlug={planSlug}
          subscriptionStatus={subscriptionStatus}
          allowCreativeMemoryAi={allowCreativeMemoryAi}
          agencyBrainFeatures={agencyBrainFeatures}
          isPlatformAdmin={isPlatformAdmin}
          collapsed={ready ? collapsed : false}
          onToggleCollapse={toggleCollapsed}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CommandStripProvider>
            <main
              ref={mainRef}
              onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 400)}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 md:px-6"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "var(--scrollbar-color) transparent"
              }}
            >
              <BillingGateModal planSlug={planSlug} status={subscriptionStatus} />
              <FirstLoginTermsGate />
              <div className="mx-auto w-full max-w-[1600px]">{children}</div>
            </main>
          </CommandStripProvider>
        </div>

        {showTop ? (
          <button
            type="button"
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Voltar ao topo"
            className="ui-btn-accent fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full transition print:hidden"
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
