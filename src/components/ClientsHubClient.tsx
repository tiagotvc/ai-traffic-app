"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CreateClientWizard } from "@/components/CreateClientWizard";
import { Link } from "@/i18n/navigation";

type ClientRow = {
  id: string;
  slug: string;
  name: string;
  roas: number;
  accounts: number;
  alertCount: number;
};

export function ClientsHubClient() {
  const t = useTranslations("clientsHub");
  const [clients, setClients] = useState<ClientRow[]>([]);

  function reload() {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j) => setClients(j.clients ?? []));
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-4">
      <div className="ui-card p-4">
        <div className="text-lg font-bold text-slate-900">{t("title")}</div>
        <div className="text-sm text-slate-500">{t("subtitle")}</div>
        <div className="mt-4">
          <CreateClientWizard onCreated={reload} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.slug}`}
            className="ui-card block p-4 transition hover:border-brand/40 hover:shadow-cardHover"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{c.name}</div>
              {c.alertCount > 0 ? (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {c.alertCount} {t("alerts")}
                </span>
              ) : (
                <span className="text-[10px] text-emerald-500">{t("ok")}</span>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {t("accounts", { count: c.accounts })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
