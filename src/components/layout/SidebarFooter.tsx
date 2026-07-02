"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { SidebarUserBlock } from "@/components/layout/SidebarUxChrome";
import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";

export function SidebarFooter({
  userName,
  userEmail,
  planName,
  subscriptionStatus,
  collapsed,
  isPlatformAdmin = false,
  onNavigate,
  mobileFullScreen = false
}: {
  userName: string;
  userEmail?: string;
  planName?: string;
  subscriptionStatus?: string;
  collapsed: boolean;
  isPlatformAdmin?: boolean;
  onNavigate?: () => void;
  mobileFullScreen?: boolean;
}) {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [signingOut, setSigningOut] = useState(false);

  const billingWarning =
    subscriptionStatus === "past_due" || subscriptionStatus === "suspended";

  const subtitle = planName ?? tNav("planTitle");
  const userSubtitle = billingWarning ? `${subtitle} !` : subtitle;

  function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    void (async () => {
      try {
        sessionStorage.removeItem("traffic-auto-sync-done");
      } catch {
        /* ignore */
      }
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
      window.location.assign("/login");
    })();
  }

  return (
    <>
      <div className="relative shrink-0" style={{ background: "#0a0f14" }}>
        <SidebarUserBlock
          userName={userName}
          userEmail={userEmail}
          subtitle={userSubtitle}
          collapsed={collapsed}
          isPlatformAdmin={isPlatformAdmin}
          planName={planName}
          onNavigate={onNavigate}
          onSignOut={signOut}
          signingOut={signingOut}
          mobileFullScreen={mobileFullScreen}
        />
      </div>
      <OrionTrafficLoadingOverlay
        open={signingOut}
        title={tCommon("signingOut")}
        message={tCommon("signingOut")}
        variant="traffic"
      />
    </>
  );
}
