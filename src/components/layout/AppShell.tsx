"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import { PublishPanelHost } from "@/components/publish/PublishPanelHost";
import { PublishPanelProvider } from "@/components/publish/PublishPanelContext";
import { AppSidebar } from "@/components/layout/AppSidebar";

const STORAGE_KEY = "traffic-ai-sidebar-collapsed";

export function AppShell({
  children,
  userName,
  userEmail,
  alertCount
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  alertCount: number;
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
    <PublishPanelProvider>
      <div className="flex h-screen overflow-hidden bg-[#f4f6f9]">
        <AppSidebar
          userName={userName}
          userEmail={userEmail}
          alertCount={alertCount}
          collapsed={ready ? collapsed : false}
          onToggleCollapse={toggleCollapsed}
        />
        <main
          ref={mainRef}
          onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 400)}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
        >
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
