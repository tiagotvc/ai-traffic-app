"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackEvent, trackMetaEvent } from "@/lib/analytics";

/**
 * Fires conversion events that arrive via a redirect query param (server actions /
 * OAuth callbacks can't call the browser tracker directly). Each marker fires at
 * most once per browser session, guarded by sessionStorage:
 *
 *   • `?signup=1`         → sign_up            (Meta CompleteRegistration)   — set by registerWithCredentials
 *   • `?metaConnected=1`  → connect_ad_account (activation "aha" moment)     — set by /api/meta/oauth/callback
 *
 * Mounted inside [[src/components/analytics/AnalyticsProvider.tsx]], so it inherits
 * the same consent gating (trackEvent/trackMetaEvent no-op without consent).
 */
function ConversionBeaconInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;

    const fireOnce = (key: string, fn: () => void) => {
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        /* private mode / storage disabled — fire anyway, worst case a rare dupe */
      }
      fn();
    };

    if (searchParams.get("signup") === "1") {
      fireOnce("conv:sign_up", () => {
        trackEvent("sign_up", { method: "credentials" });
        void trackMetaEvent("CompleteRegistration", {
          customData: { content_name: "account_signup" }
        });
      });
    }

    if (searchParams.get("metaConnected") === "1") {
      fireOnce("conv:connect_ad_account", () => {
        trackEvent("connect_ad_account", { provider: "meta" });
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function ConversionBeacon() {
  return (
    <Suspense fallback={null}>
      <ConversionBeaconInner />
    </Suspense>
  );
}
