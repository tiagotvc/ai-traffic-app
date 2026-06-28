"use client";

import { useCallback, useEffect, useState } from "react";

import type { AudienceCreateContext, SavedAudienceSummary } from "@/components/audiences/create/types";
import { AudienceCreatorUxPage } from "@/uxpilot-ui/adapters/AudienceCreatorUxPage";
import { useRouter } from "@/i18n/navigation";

type HubClient = {
  slug: string;
  name: string;
  defaultAdAccountId: string | null;
  adAccounts: { metaAdAccountId: string }[];
};

export function MetaAudienceCreateView() {
  const router = useRouter();
  const [clients, setClients] = useState<HubClient[]>([]);
  const [audiences, setAudiences] = useState<SavedAudienceSummary[]>([]);
  const [clientSlug, setClientSlug] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAudiences = useCallback(async (slug: string, accountId: string) => {
    if (!slug || !accountId) {
      setAudiences([]);
      return;
    }
    const qs = new URLSearchParams({ clientId: slug, adAccountId: accountId });
    const res = await fetch(`/api/audiences/hub?${qs}`);
    const j = await res.json();
    if (j.ok) setAudiences(j.savedAudiences ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/audiences/hub")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as HubClient[];
        setClients(list);
        const first = list[0];
        if (!first) return;
        const account =
          first.defaultAdAccountId ?? first.adAccounts[0]?.metaAdAccountId ?? "";
        setClientSlug(first.slug);
        setAdAccountId(account);
        void loadAudiences(first.slug, account);
      })
      .finally(() => setLoading(false));
  }, [loadAudiences]);

  useEffect(() => {
    if (clientSlug && adAccountId) void loadAudiences(clientSlug, adAccountId);
  }, [clientSlug, adAccountId, loadAudiences]);

  const client = clients.find((c) => c.slug === clientSlug);

  const createCtx: AudienceCreateContext | null =
    client && adAccountId
      ? {
          clientSlug,
          clientName: client.name,
          adAccountId,
          audiences,
          onSuccess: () => router.push("/audiences/meta"),
          onError: () => {},
          onRefresh: () => void loadAudiences(clientSlug, adAccountId)
        }
      : null;

  if (loading) {
    return <p className="p-8 text-sm text-[var(--text-dim)]">…</p>;
  }

  if (!createCtx) {
    return <p className="p-8 text-sm text-[var(--text-dim)]">Selecione um cliente primeiro.</p>;
  }

  return (
    <AudienceCreatorUxPage
      bareShell
      ctx={createCtx}
      clients={clients.map((c) => ({ slug: c.slug, name: c.name }))}
      clientSlug={clientSlug}
      onClientChange={setClientSlug}
      onBack={() => router.push("/audiences/meta")}
    />
  );
}
