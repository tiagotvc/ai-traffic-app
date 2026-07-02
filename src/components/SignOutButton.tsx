"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";

function LogOutIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
      />
    </svg>
  );
}

export function SignOutButton({
  variant = "default"
}: {
  variant?: "default" | "sidebar";
  collapsed?: boolean;
}) {
  const t = useTranslations("common");
  const [isPending, setIsPending] = useState(false);

  const className =
    variant === "sidebar"
      ? "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[#94a3b8] transition hover:bg-white/10 hover:text-white disabled:opacity-60"
      : "ui-btn-secondary mt-3 w-full !px-3 !py-2 text-xs disabled:opacity-60";

  async function handleSignOut() {
    if (isPending) return;
    setIsPending(true);
    try {
      sessionStorage.removeItem("traffic-auto-sync-done");
    } catch {
      /* ignore */
    }
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.assign("/login");
  }

  return (
    <>
    <button
      type="button"
      disabled={isPending}
      title={isPending ? t("signingOut") : t("signOut")}
      aria-label={isPending ? t("signingOut") : t("signOut")}
      onClick={() => void handleSignOut()}
      className={className}
    >
      {variant === "sidebar" ? (
        isPending ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <LogOutIcon />
        )
      ) : isPending ? (
        t("signingOut")
      ) : (
        t("signOut")
      )}
    </button>
    <OrionTrafficLoadingOverlay
      open={isPending}
      title={t("signingOut")}
      message={t("signingOut")}
      variant="traffic"
    />
    </>
  );
}
