"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { DsBadge, DsPageHeader } from "@/design-system";
import { AgencyBrainAiProvider } from "@/components/agency-brain/AgencyBrainAiContext";
import {
  AgencyBrainClientProvider,
  type AgencyBrainClientRow
} from "@/components/agency-brain/AgencyBrainClientContext";
import { AGENCY_BRAIN_MODULE_REGISTRY } from "@/lib/agency-brain/domain/modules";
import type { AgencyBrainMvpModuleId } from "@/lib/agency-brain/domain/mvp";
import { usePathname } from "@/i18n/navigation";
import { Brain } from "lucide-react";

const MVP_SHELL_MODULES: AgencyBrainMvpModuleId[] = [
  "hypotheses",
  "dna",
  "suggestions"
];

function resolveMvpModule(pathname: string): AgencyBrainMvpModuleId | null {
  const mod = AGENCY_BRAIN_MODULE_REGISTRY.find((m) => pathname.includes(m.route));
  if (!mod) return null;
  if (mod.id === "suggestions") return "suggestions";
  if (MVP_SHELL_MODULES.includes(mod.id as AgencyBrainMvpModuleId)) {
    return mod.id as AgencyBrainMvpModuleId;
  }
  return null;
}

function isInsightsFeedRoute(pathname: string): boolean {
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  return (
    base === "/agency-brain" ||
    base === "/agency-brain/learnings" ||
    base === "/agency-brain/hypotheses"
  );
}

function isInsightsMvpRoute(pathname: string): boolean {
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  if (base === "/agency-brain") return true;
  if (base === "/agency-brain/learnings") return true;
  if (base === "/agency-brain/hypotheses") return true;
  if (/^\/agency-brain\/learnings\/[^/]+$/.test(base)) return true;
  if (/^\/agency-brain\/hypotheses\/[^/]+$/.test(base)) return true;
  return false;
}

export function AgencyBrainShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("agencyBrain");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInsightsRoute = isInsightsMvpRoute(pathname);
  const isFeedRoute = isInsightsFeedRoute(pathname);
  const mvpModule = resolveMvpModule(pathname);

  const [clients, setClients] = useState<AgencyBrainClientRow[]>([]);
  const [clientSlug, setClientSlug] = useState("");
  const [clientsLoading, setClientsLoading] = useState(true);
  const strip = useCommandStripOptional();

  useEffect(() => {
    const clientFromUrl = searchParams.get("client");
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as AgencyBrainClientRow[];
        setClients(list);

        const globalSlug =
          strip?.clientFilter && list.some((c) => c.slug === strip.clientFilter)
            ? strip.clientFilter
            : "";
        const slugFromUrl =
          clientFromUrl && list.some((c) => c.slug === clientFromUrl) ? clientFromUrl : "";
        const slug = globalSlug || slugFromUrl || list[0]?.slug || "";
        setClientSlug(slug);

        if (slug && strip && strip.clientFilter !== slug) {
          strip.setClientFilter(slug);
        }

        if (slug && slug !== clientFromUrl && !globalSlug) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("client", slug);
          router.replace(`${pathname}?${params.toString()}`);
        }
      })
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!strip?.clientFilter || clientsLoading) return;
    if (!clients.some((c) => c.slug === strip.clientFilter)) return;
    if (strip.clientFilter !== clientSlug) {
      setClientSlug(strip.clientFilter);
    }
  }, [strip?.clientFilter, clientSlug, clients, clientsLoading, strip]);

  function handleClientChange(slug: string) {
    setClientSlug(slug);
    strip?.setClientFilter(slug);
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("client", slug);
    else params.delete("client");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  if (clientsLoading) {
    return (
      <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">
        {t("loadingClients")}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">
        {t("noClients")}
      </div>
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

  if (isInsightsRoute) {
    return (
      <AgencyBrainAiProvider>
        <AgencyBrainClientProvider
          clientSlug={clientSlug}
          clients={clients}
          onClientChange={handleClientChange}
        >
          {children}
        </AgencyBrainClientProvider>
      </AgencyBrainAiProvider>
    );
  }

  return (
    <AgencyBrainAiProvider>
      <div className="space-y-4">
        <DsPageHeader
          className="mb-0"
          title={mvpModule ? t(`mvp_${mvpModule}_title`) : t("title")}
          subtitle={mvpModule ? t(`mvp_${mvpModule}_hint`) : t("subtitle")}
          titleIcon={<Brain size={16} aria-hidden />}
          badge={<DsBadge tone="beta">{t("beta")}</DsBadge>}
        />
        {body}
      </div>
    </AgencyBrainAiProvider>
  );
}
