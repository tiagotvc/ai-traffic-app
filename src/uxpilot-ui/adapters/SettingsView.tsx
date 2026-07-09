"use client";

import type { ReactNode } from "react";

import { SettingsContentLive } from "@/uxpilot-ui/adapters/SettingsContentLive";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function SettingsView({
  locale,
  metaOAuthConfigured,
  metaOAuthError,
  connectMetaSlot,
  googleAdsEnabled = false
}: {
  locale: string;
  metaOAuthConfigured: boolean;
  metaOAuthError: string | null;
  connectMetaSlot: ReactNode;
  googleAdsEnabled?: boolean;
}) {
  return (
    <UxPageMain gap="loose">
      <SettingsContentLive
        locale={locale}
        metaOAuthConfigured={metaOAuthConfigured}
        metaOAuthError={metaOAuthError}
        connectMetaSlot={connectMetaSlot}
        googleAdsEnabled={googleAdsEnabled}
      />
    </UxPageMain>
  );
}
