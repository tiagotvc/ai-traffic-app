"use client";

import type { ReactNode } from "react";

import { SettingsContentLive } from "@/uxpilot-ui/adapters/SettingsContentLive";

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
    <SettingsContentLive
      locale={locale}
      metaOAuthConfigured={metaOAuthConfigured}
      metaOAuthError={metaOAuthError}
      connectMetaSlot={connectMetaSlot}
    />
  );
}
