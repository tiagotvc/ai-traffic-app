"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { AgencyBrainClientField } from "@/components/agency-brain/AgencyBrainClientField";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export function AgencyBrainClientGate({
  children,
  hint
}: {
  children: (clientId: string) => ReactNode;
  hint?: string;
}) {
  const t = useTranslations("agencyBrain");
  const { clientSlug } = useAgencyBrainClient();

  if (!clientSlug) {
    return (
      <div className="ui-card space-y-4 p-6">
        <div>
          <p className="text-sm font-medium text-[var(--text-main)]">{t("selectClientTitle")}</p>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{hint ?? t("selectClientHint")}</p>
        </div>
        <AgencyBrainClientField />
      </div>
    );
  }

  return <>{children(clientSlug)}</>;
}
