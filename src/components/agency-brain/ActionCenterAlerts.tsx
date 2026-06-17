"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";

type AlertRow = {
  id: string;
  title: string;
  description: string;
  severity: string;
  metaCampaignId?: string | null;
};

export function ActionCenterAlerts({ clientId }: { clientId: string }) {
  const t = useTranslations("actionCenter");
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/alerts?severity=critical&clientId=${encodeURIComponent(clientId)}&limit=5&dismissed=0`
    )
      .then((r) => r.json())
      .then((j) => setAlerts(j.alerts ?? []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading || alerts.length === 0) return null;

  return (
    <section className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-rose-800">{t("criticalAlertsTitle")}</h2>
          <p className="text-xs text-rose-600/80">{t("criticalAlertsSubtitle")}</p>
        </div>
        <Link href="/alerts" className="text-xs font-medium text-violet-600 hover:underline">
          {t("viewAllAlerts")}
        </Link>
      </div>
      <div className="space-y-1.5">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="rounded-lg border border-rose-100 bg-white/90 px-3 py-2 text-xs text-slate-700"
          >
            <div className="font-semibold text-rose-800">{a.title}</div>
            {a.description ? <p className="mt-0.5 text-slate-600">{a.description}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
