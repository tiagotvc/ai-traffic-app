"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { Building2 } from "lucide-react";

import { CreateClientWizard } from "@/components/CreateClientWizard";
import { DsPageHeader } from "@/design-system";
import { Link } from "@/i18n/navigation";
import { METRIC_BY_KEY, formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { presetMetricsFor } from "@/lib/campaign-presets";

type ClientRow = {
  id: string;
  slug: string;
  name: string;
  roas: number;
  accounts: number;
  alertCount: number;
  metrics?: Partial<Record<MetricKey, number>>;
  dominantPreset?: string;
};

function isProtectedClient(name: string, slug: string) {
  return name === "Default" || slug === "default";
}

export function ClientsHubClient() {
  const t = useTranslations("clientsHub");
  const tMetrics = useTranslations("metrics");
  const locale = useLocale();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const deletableClients = useMemo(
    () => clients.filter((c) => !isProtectedClient(c.name, c.slug)),
    [clients]
  );

  const selectedIds = useMemo(
    () => deletableClients.filter((c) => selected[c.id]).map((c) => c.id),
    [deletableClients, selected]
  );

  const allSelected =
    deletableClients.length > 0 && deletableClients.every((c) => selected[c.id]);

  const reload = useCallback(() => {
    // period=thisWeek: o card mostra o resumo da semana (segunda → hoje).
    fetch("/api/clients?period=thisWeek")
      .then((r) => r.json())
      .then((j) => setClients(j.clients ?? []));
  }, []);

  const deleteClients = useCallback(
    async (ids: string[], confirm: () => boolean) => {
      if (!ids.length) return;
      if (!confirm()) return;
      startTransition(async () => {
        const res = await fetch("/api/clients/bulk-delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientIds: ids })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) {
          window.alert(String(j.error ?? t("deleteFailed")));
          return;
        }
        const deleted = Number(j.deletedCount ?? 0);
        const skipped = Array.isArray(j.skipped) ? j.skipped.length : 0;
        if (skipped > 0) {
          setMessage(t("bulkDeletePartial", { deleted, skipped }));
        } else {
          setMessage(t("bulkDeleteDone", { count: deleted }));
        }
        setSelected({});
        window.dispatchEvent(new Event("traffic:campaigns-reload"));
        reload();
        window.setTimeout(() => setMessage(null), 6000);
      });
    },
    [reload, t]
  );

  const handleDelete = useCallback(
    (c: ClientRow, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isProtectedClient(c.name, c.slug)) {
        window.alert(t("cannotDeleteDefault"));
        return;
      }
      void deleteClients([c.id], () => window.confirm(t("deleteConfirm", { name: c.name })));
    },
    [deleteClients, t]
  );

  const handleBulkDelete = useCallback(() => {
    void deleteClients(selectedIds, () => window.confirm(t("bulkDeleteConfirm", { count: selectedIds.length })));
  }, [deleteClients, selectedIds, t]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="space-y-4">
      <DsPageHeader title={t("title")} subtitle={t("subtitle")} titleIcon={<Building2 size={16} />} />

      <div className="ui-card p-4">
        <div className="mt-0">
          <CreateClientWizard onCreated={reload} />
        </div>
      </div>

      {deletableClients.length > 0 ? (
        <div className="ui-card flex flex-wrap items-center gap-3 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-main)]">
            <input
              type="checkbox"
              className="accent-violet-600"
              checked={allSelected}
              disabled={isPending}
              onChange={(e) => {
                if (!e.target.checked) {
                  setSelected({});
                  return;
                }
                const next: Record<string, boolean> = {};
                for (const c of deletableClients) next[c.id] = true;
                setSelected(next);
              }}
            />
            {t("selectAll")}
          </label>
          <span className="text-xs text-[var(--text-dim)]">{t("selectedCount", { count: selectedIds.length })}</span>
          <button
            type="button"
            disabled={isPending || selectedIds.length === 0}
            onClick={handleBulkDelete}
            className="ui-btn-danger px-3 py-1.5 text-xs disabled:opacity-40"
          >
            {t("bulkDelete")}
          </button>
          {selectedIds.length > 0 ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => setSelected({})}
              className="text-xs text-[var(--text-dim)] hover:text-[var(--text-main)]"
            >
              {t("clearSelection")}
            </button>
          ) : null}
          {message ? <span className="text-xs text-emerald-700">{message}</span> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((c) => {
          const protectedClient = isProtectedClient(c.name, c.slug);
          return (
            <div
              key={c.id}
              className={`ui-card p-4 transition hover:border-[var(--amber)]/40 hover:shadow-cardHover ${
                selected[c.id] ? "ring-2 ring-[rgba(245,166,35,0.25)]" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {!protectedClient ? (
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-violet-600"
                    checked={!!selected[c.id]}
                    disabled={isPending}
                    onChange={(e) =>
                      setSelected((p) => ({ ...p, [c.id]: e.target.checked }))
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="w-4" aria-hidden />
                )}
                <Link href={`/clients/${c.slug}`} className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{c.name}</div>
                    {c.alertCount > 0 ? (
                      <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        {c.alertCount} {t("alerts")}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-emerald-500">{t("ok")}</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-dim)]">
                    {t("accounts", { count: c.accounts })}
                  </div>
                </Link>
                {!protectedClient ? (
                  <button
                    type="button"
                    disabled={isPending}
                    title={t("deleteClient")}
                    onClick={(e) => handleDelete(c, e)}
                    className="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {t("deleteClient")}
                  </button>
                ) : null}
              </div>

              {/* Prévia da semana — métricas do tipo dominante das campanhas do cliente */}
              <Link
                href={`/clients/${c.slug}`}
                className="mt-3 block rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] p-2.5 hover:bg-[var(--row-hover)]"
              >
                <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
                  {t("todaySummary")}
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {presetMetricsFor(c.dominantPreset)
                    .slice(0, 3)
                    .map((key) => (
                      <div key={key}>
                        <div className="text-[10px] text-[var(--text-dim)]">
                          {tMetrics(METRIC_BY_KEY[key].label)}
                        </div>
                        <div className="text-sm font-semibold text-[var(--text-main)]">
                          {formatMetricValue(key, c.metrics?.[key] ?? 0, locale)}
                        </div>
                      </div>
                    ))}
                </div>
              </Link>

              <div className="mt-2 flex justify-end">
                <Link
                  href={`/clients/${c.slug}/settings`}
                  className="ui-link text-xs"
                >
                  {t("edit")}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
