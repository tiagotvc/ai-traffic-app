"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AgencyBrainAiProvider } from "@/components/agency-brain/AgencyBrainAiContext";
import {
  AgencyBrainClientProvider,
  type AgencyBrainClientRow
} from "@/components/agency-brain/AgencyBrainClientContext";
import { usePathname } from "@/i18n/navigation";

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
        const slug =
          clientFromUrl && list.some((c) => c.slug === clientFromUrl) ? clientFromUrl : "";
        setClientSlug(slug);
      })
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClientChange(slug: string) {
    setClientSlug(slug);
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("client", slug);
    else params.delete("client");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  if (clientsLoading) {
    return (
      <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loadingClients")}</div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="ui-card p-8 text-center text-sm text-slate-500">{t("noClients")}</div>
    );
  }

  const body = (
    <AgencyBrainClientProvider
      clientSlug={clientSlug}
      clients={clients}
      onClientChange={handleClientChange}
    >
      {children}
    </AgencyBrainClientProvider>
  );

  if (isLearningsPage) {
    return (
      <AgencyBrainAiProvider>
        <div className="flex h-[calc(100dvh-5.5rem)] min-h-[480px] flex-col lg:h-[calc(100dvh-6.5rem)]">
          {body}
        </div>
      </AgencyBrainAiProvider>
    );
  }

  return (
    <AgencyBrainAiProvider>
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              {t("beta")}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>

        {body}
      </div>
    </AgencyBrainAiProvider>
  );
}
