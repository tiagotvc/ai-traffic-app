"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

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

function isProtectedClient(name: string, slug: string) {
  return name === "Default" || slug === "default";
}

export function ClientsHubClient() {
  const t = useTranslations("clientsHub");
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
    fetch("/api/clients")
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
      <div className="ui-card p-4">
        <div className="text-lg font-bold text-slate-900">{t("title")}</div>
        <div className="text-sm text-slate-500">{t("subtitle")}</div>
        <div className="mt-4">
          <CreateClientWizard onCreated={reload} />
        </div>
      </div>

      {deletableClients.length > 0 ? (
        <div className="ui-card flex flex-wrap items-center gap-3 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
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
          <span className="text-xs text-slate-500">{t("selectedCount", { count: selectedIds.length })}</span>
          <button
            type="button"
            disabled={isPending || selectedIds.length === 0}
            onClick={handleBulkDelete}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-40"
          >
            {t("bulkDelete")}
          </button>
          {selectedIds.length > 0 ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => setSelected({})}
              className="text-xs text-slate-500 hover:text-slate-800"
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
              className={`ui-card p-4 transition hover:border-brand/40 hover:shadow-cardHover ${
                selected[c.id] ? "ring-2 ring-violet-200" : ""
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
                  <div className="mt-2 text-xs text-slate-500">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
