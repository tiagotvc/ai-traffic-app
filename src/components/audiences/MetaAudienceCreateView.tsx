"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useAudienceScope } from "@/components/audiences/AudienceScopeContext";
import type { AudienceCreateContext, SavedAudienceSummary } from "@/components/audiences/create/types";
import { AudienceCreatorUxPage } from "@/uxpilot-ui/adapters/AudienceCreatorUxPage";
import { useRouter } from "@/i18n/navigation";

export function MetaAudienceCreateView() {
  const t = useTranslations("audiences");
  const router = useRouter();
  const scope = useAudienceScope();
  const { clientSlug, adAccountId, scopeKey } = scope;
  const [audiences, setAudiences] = useState<SavedAudienceSummary[]>([]);

  const loadAudiences = useCallback(
    async (slug: string, accountId: string, refresh = false) => {
      if (!slug || !accountId) {
        setAudiences([]);
        return;
      }
      const qs = new URLSearchParams({ clientId: slug, adAccountId: accountId });
      // O cache de públicos tem TTL de 30 min; após criar um público precisamos
      // furar o cache, senão ele só apareceria na lista meia hora depois.
      if (refresh) qs.set("refresh", "1");
      const res = await fetch(`/api/audiences/hub?${qs}`);
      const j = await res.json();
      if (j.ok) setAudiences(j.savedAudiences ?? []);
    },
    []
  );

  useEffect(() => {
    void loadAudiences(clientSlug, adAccountId);
  }, [clientSlug, adAccountId, loadAudiences]);

  if (scope.loading) {
    return <p className="p-8 text-sm text-[var(--text-dim)]">…</p>;
  }

  if (!scope.client || !adAccountId) {
    return <p className="p-8 text-sm text-[var(--text-dim)]">{t("scopeSelectClientFirst")}</p>;
  }

  const createCtx: AudienceCreateContext = {
    clientSlug,
    clientName: scope.clientName,
    adAccountId,
    audiences,
    onSuccess: () => router.push("/audiences/meta"),
    onError: () => {},
    onRefresh: () => void loadAudiences(clientSlug, adAccountId, true)
  };

  return (
    <AudienceCreatorUxPage
      // Remonta ao trocar de cliente/conta: o estado do wizard (pixel, página,
      // público-semente) pertence à conta anterior e não pode vazar.
      key={scopeKey}
      bareShell
      ctx={createCtx}
      onBack={() => router.push("/audiences/meta")}
    />
  );
}
