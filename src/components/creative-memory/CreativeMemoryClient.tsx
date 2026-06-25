"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AgencyBrainContent } from "@/components/agency-brain/AgencyBrainContent";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { CreativeMemoryAiBar } from "@/components/creative-memory/CreativeMemoryAiBar";
import { CreativeMemoryAiProvider } from "@/components/creative-memory/CreativeMemoryAiContext";
import {
  CreativeMemoryTabs,
  type CreativeMemoryTab
} from "@/components/creative-memory/CreativeMemoryTabs";
import { SuggestionsContent } from "@/components/suggestions/SuggestionsContent";
import { DsPageHeader } from "@/design-system";
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
    fetch("/api/clients?minimal=1")
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
      <DsPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <FilterSelectDropdown
            icon={<Building2 size={14} />}
            label={t("clientLabel")}
            placeholder={t("clientLabel")}
            value={clientSlug}
            onChange={handleClientChange}
            disabled={clientsLoading || clients.length === 0}
            clearable={false}
            options={clients.map((c) => ({ value: c.slug, label: c.name }))}
          />
        }
      />

      {clientsLoading ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("loadingClients")}</div>
      ) : clients.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("noClients")}</div>
      ) : clientSlug ? (
        <CreativeMemoryAiProvider>
          <CreativeMemoryAiBar />
          <CreativeMemoryTabs clientSlug={clientSlug} activeTab={activeTab} />
          {activeTab === "learnings" ? (
            <AgencyBrainContent key={`learnings-${clientSlug}`} clientId={clientSlug} />
          ) : (
            <SuggestionsContent key={`suggestions-${clientSlug}`} clientId={clientSlug} />
          )}
        </CreativeMemoryAiProvider>
      ) : null}
    </div>
  );
}
