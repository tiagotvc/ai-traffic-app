"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AgencyBrainAiBar } from "@/components/agency-brain/AgencyBrainAiBar";
import { AgencyBrainAiProvider } from "@/components/agency-brain/AgencyBrainAiContext";
import {
  AgencyBrainClientProvider,
  type AgencyBrainClientRow
} from "@/components/agency-brain/AgencyBrainClientContext";
import { usePathname } from "@/i18n/navigation";

function defaultClientSlug(list: AgencyBrainClientRow[], preferred?: string | null): string {
  if (preferred && list.some((c) => c.slug === preferred)) return preferred;
  return list.find((c) => c.slug !== "default")?.slug ?? list[0]?.slug ?? "";
}

export function AgencyBrainShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("agencyBrain");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isLearningsPage = pathname.includes("/learnings");

  const [clients, setClients] = useState<AgencyBrainClientRow[]>([]);
  const [clientSlug, setClientSlug] = useState("");
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(() => {
    const clientFromUrl = searchParams.get("client");
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as AgencyBrainClientRow[];
        setClients(list);
        const slug = defaultClientSlug(list, clientFromUrl);
        setClientSlug(slug);
        if (!slug) return;
        if (clientFromUrl !== slug) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("client", slug);
          router.replace(`${pathname}?${params.toString()}`);
        }
      })
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClientChange(slug: string) {
    setClientSlug(slug);
    const params = new URLSearchParams(searchParams.toString());
    params.set("client", slug);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const clientBody =
    clientsLoading ? (
      <div className="ui-card flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
        {t("loadingClients")}
      </div>
    ) : clients.length === 0 ? (
      <div className="ui-card flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
        {t("noClients")}
      </div>
    ) : clientSlug ? (
      <AgencyBrainClientProvider
        clientSlug={clientSlug}
        clients={clients}
        onClientChange={handleClientChange}
      >
        {children}
      </AgencyBrainClientProvider>
    ) : null;

  if (isLearningsPage) {
    return (
      <AgencyBrainAiProvider>
        <div className="flex h-[calc(100dvh-5.5rem)] min-h-[480px] flex-col lg:h-[calc(100dvh-6.5rem)]">
          {clientBody}
        </div>
      </AgencyBrainAiProvider>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              {t("beta")}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!clientsLoading && clients.length > 0 && clientSlug ? (
            <AgencyBrainAiBar />
          ) : null}
          <span className="text-xs text-slate-500">{t("clientLabel")}:</span>
          <select
            value={clientSlug}
            onChange={(e) => handleClientChange(e.target.value)}
            disabled={clientsLoading || clients.length === 0}
            className="ui-select !w-auto !py-1.5 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {clientsLoading ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loadingClients")}</div>
      ) : clients.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("noClients")}</div>
      ) : clientSlug ? (
        <AgencyBrainAiProvider>
          <AgencyBrainClientProvider
            clientSlug={clientSlug}
            clients={clients}
            onClientChange={handleClientChange}
          >
            {children}
          </AgencyBrainClientProvider>
        </AgencyBrainAiProvider>
      ) : null}
    </div>
  );
}
