"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AgencyBrainContent } from "@/components/agency-brain/AgencyBrainContent";
import {
  CreativeMemoryTabs,
  type CreativeMemoryTab
} from "@/components/creative-memory/CreativeMemoryTabs";
import { SuggestionsContent } from "@/components/suggestions/SuggestionsContent";
import { usePathname } from "@/i18n/navigation";

type ClientRow = { id: string; slug: string; name: string };

function parseTab(value: string | null): CreativeMemoryTab {
  return value === "suggestions" ? "suggestions" : "learnings";
}

function defaultClientSlug(list: ClientRow[], preferred?: string | null): string {
  if (preferred && list.some((c) => c.slug === preferred)) return preferred;
  return list.find((c) => c.slug !== "default")?.slug ?? list[0]?.slug ?? "";
}

export function CreativeMemoryClient() {
  const t = useTranslations("creativeMemory");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientSlug, setClientSlug] = useState("");
  const [clientsLoading, setClientsLoading] = useState(true);

  const activeTab = parseTab(searchParams.get("tab"));

  useEffect(() => {
    const clientFromUrl = searchParams.get("client");
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as ClientRow[];
        setClients(list);
        const slug = defaultClientSlug(list, clientFromUrl);
        setClientSlug(slug);

        if (!slug) return;
        const params = new URLSearchParams();
        params.set("client", slug);
        params.set("tab", parseTab(searchParams.get("tab")));
        if (clientFromUrl !== slug || !searchParams.get("tab")) {
          router.replace(`${pathname}?${params.toString()}`);
        }
      })
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once from URL + clients list
  }, []);

  function handleClientChange(slug: string) {
    setClientSlug(slug);
    const params = new URLSearchParams(searchParams.toString());
    params.set("client", slug);
    if (!params.get("tab")) params.set("tab", activeTab);
    router.replace(`${pathname}?${params.toString()}`);
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
        <>
          <CreativeMemoryTabs clientSlug={clientSlug} activeTab={activeTab} />
          {activeTab === "learnings" ? (
            <AgencyBrainContent key={`learnings-${clientSlug}`} clientId={clientSlug} />
          ) : (
            <SuggestionsContent key={`suggestions-${clientSlug}`} clientId={clientSlug} />
          )}
        </>
      ) : null}
    </div>
  );
}
