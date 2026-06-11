"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CreativesLibraryView } from "@/components/creatives/CreativesLibraryView";
import { CreativesByCampaignView } from "@/components/creatives/CreativesByCampaignView";

type ClientRow = { id: string; slug: string; name: string };

export function CreativesLibraryClient() {
  const t = useTranslations("creatives");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [view, setView] = useState<"library" | "byCampaign">("library");

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.clients ?? []) as ClientRow[];
        setClients(list);
        setClientId(
          (prev) => prev || list.find((c) => c.slug !== "default")?.slug || list[0]?.slug || ""
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <span className="text-violet-600">📢</span>
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
            {(["library", "byCampaign"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  view === v ? "bg-violet-100 text-violet-700" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {v === "library" ? t("viewLibrary") : t("viewByCampaign")}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">{t("clientLabel")}:</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
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

      {clientId ? (
        view === "library" ? (
          <CreativesLibraryView
            key={clientId}
            fetchUrl={`/api/creatives/library?clientId=${encodeURIComponent(clientId)}`}
            translationNs="creatives"
          />
        ) : (
          <CreativesByCampaignView key={clientId} clientId={clientId} clientSlug={clientId} />
        )
      ) : null}
    </div>
  );
}
