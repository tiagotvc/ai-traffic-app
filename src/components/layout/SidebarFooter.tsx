"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

import { SidebarUserBlock } from "@/components/layout/SidebarUxChrome";

export function SidebarFooter({
  userName,
  planName,
  subscriptionStatus,
  collapsed,
  isPlatformAdmin = false,
  onNavigate,
  mobileFullScreen = false
}: {
  userName: string;
  planName?: string;
  subscriptionStatus?: string;
  collapsed: boolean;
  isPlatformAdmin?: boolean;
  onNavigate?: () => void;
  mobileFullScreen?: boolean;
}) {
  const tNav = useTranslations("nav");
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();

  const billingWarning =
    subscriptionStatus === "past_due" || subscriptionStatus === "suspended";

  const subtitle = planName ?? tNav("planTitle");
  const userSubtitle = billingWarning ? `${subtitle} !` : subtitle;

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

  return (
    <div className="relative shrink-0" style={{ background: "#0a0f14" }}>
      <SidebarUserBlock
        userName={userName}
        subtitle={userSubtitle}
        collapsed={collapsed}
        isPlatformAdmin={isPlatformAdmin}
        onNavigate={onNavigate}
        onSignOut={signOut}
        signingOut={signingOut}
        mobileFullScreen={mobileFullScreen}
      />
    </div>
  );
}
