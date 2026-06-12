"use client";

import { Suspense, useEffect, useState } from "react";

import { PublishPanelHost } from "@/components/publish/PublishPanelHost";
import { PublishPanelProvider } from "@/components/publish/PublishPanelContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BillingGateModal } from "@/components/billing/BillingGateModal";

const STORAGE_KEY = "traffic-ai-sidebar-collapsed";

export function AppShell({
  children,
  userName,
  userEmail,
  alertCount,
  planSlug = "free",
  planName = "Free",
  subscriptionStatus = "active",
  isPlatformAdmin = false
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  alertCount: number;
  planSlug?: string;
  planName?: string;
  subscriptionStatus?: string;
  isPlatformAdmin?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

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
    <PublishPanelProvider>
      <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
        <AppSidebar
          userName={userName}
          userEmail={userEmail}
          alertCount={alertCount}
          planName={planName}
          planSlug={planSlug}
          subscriptionStatus={subscriptionStatus}
          isPlatformAdmin={isPlatformAdmin}
          collapsed={ready ? collapsed : false}
          onToggleCollapse={toggleCollapsed}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <BillingGateModal planSlug={planSlug} status={subscriptionStatus} />
          <div className="mx-auto w-full max-w-[1600px] px-6 py-6 lg:px-8 lg:py-7">{children}</div>
        </main>
      </div>
      <Suspense fallback={null}>
        <PublishPanelHost onPublished={() => window.dispatchEvent(new Event("traffic:campaigns-reload"))} />
      </Suspense>
    </PublishPanelProvider>
  );
}
