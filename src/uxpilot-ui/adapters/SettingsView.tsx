"use client";

import type { ReactNode } from "react";

import { SettingsContentLive } from "@/uxpilot-ui/adapters/SettingsContentLive";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function SettingsView({
  locale,
  metaOAuthConfigured,
  metaOAuthError,
  connectMetaSlot
}: {
  locale: string;
  metaOAuthConfigured: boolean;
  metaOAuthError: string | null;
  connectMetaSlot: ReactNode;
}) {
  return (
    <UxPageMain gap="loose">
      <SettingsContentLive
        locale={locale}
        metaOAuthConfigured={metaOAuthConfigured}
        metaOAuthError={metaOAuthError}
        connectMetaSlot={connectMetaSlot}
      />
    </UxPageMain>
  );
}
