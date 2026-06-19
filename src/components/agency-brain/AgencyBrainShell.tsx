"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AgencyBrainAiProvider } from "@/components/agency-brain/AgencyBrainAiContext";
import {
  AgencyBrainClientProvider,
  type AgencyBrainClientRow
} from "@/components/agency-brain/AgencyBrainClientContext";
import { AGENCY_BRAIN_MODULE_REGISTRY } from "@/lib/agency-brain/domain/modules";
import type { AgencyBrainMvpModuleId } from "@/lib/agency-brain/domain/mvp";
import { usePathname } from "@/i18n/navigation";

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
  return base === "/agency-brain" || base === "/agency-brain/hypotheses";
}

function isInsightsMvpRoute(pathname: string): boolean {
  const base = pathname.replace(/^\/(pt-BR|en)/, "") || "/";
  if (base === "/agency-brain") return true;
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

  useEffect(() => {
    const clientFromUrl = searchParams.get("client");
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as AgencyBrainClientRow[];
        setClients(list);

        const slugFromUrl =
          clientFromUrl && list.some((c) => c.slug === clientFromUrl) ? clientFromUrl : "";
        const slug = slugFromUrl || list[0]?.slug || "";
        setClientSlug(slug);

        if (slug && slug !== clientFromUrl) {
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
    if (slug) params.set("client", slug);
    else params.delete("client");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  if (clientsLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {t("loadingClients")}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
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
        {isFeedRoute ? (
          <div className="-mb-4 flex h-[calc(100vh-1.5rem-0.5rem)] min-h-0 flex-col overflow-hidden lg:-mb-5 lg:h-[calc(100vh-1.75rem-0.5rem)]">
            <div className="flex h-full min-h-0 flex-1 flex-col">{body}</div>
          </div>
        ) : (
          body
        )}
      </AgencyBrainAiProvider>
    );
  }

  return (
    <AgencyBrainAiProvider>
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {mvpModule ? t(`mvp_${mvpModule}_title`) : t("title")}
            </h1>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              {t("beta")}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {mvpModule ? t(`mvp_${mvpModule}_hint`) : t("subtitle")}
          </p>
        </div>
        {body}
      </div>
    </AgencyBrainAiProvider>
  );
}
