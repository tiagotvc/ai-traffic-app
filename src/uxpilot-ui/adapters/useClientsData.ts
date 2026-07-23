"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import type { MetricKey } from "@/lib/dashboard-metrics";

export type ClientRow = {
  id: string;
  slug: string;
  name: string;
  roas: number;
  accounts: number;
  alertCount: number;
  metaConnected?: boolean;
  googleConnected?: boolean;
  pixelCount?: number;
  hasPage?: boolean;
  metrics?: Partial<Record<MetricKey, number>>;
  dominantPreset?: string;
};

function isProtectedClient(name: string, slug: string) {
  return name === "Default" || slug === "default";
}

export function useClientsData() {
  const t = useTranslations("clientsHub");
  const locale = useLocale();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // no-store: a lista muda ao criar/excluir; não pode vir do cache do navegador.
      const r = await fetch(`/api/clients?period=thisWeek&_=${Date.now()}`, { cache: "no-store" });
      const j = await r.json();
      setClients(j.clients ?? []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onSync = () => reload();
    window.addEventListener("traffic-sync-done", onSync);
    window.addEventListener("traffic:campaigns-reload", onSync);
    return () => {
      window.removeEventListener("traffic-sync-done", onSync);
      window.removeEventListener("traffic:campaigns-reload", onSync);
    };
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [clients, search]);

  const deleteClients = useCallback(
    async (ids: string[], confirm: () => boolean) => {
      if (!ids.length || !confirm()) return;
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
        setMessage(t("bulkDeleteDone", { count: Number(j.deletedCount ?? 0) }));
        reload();
        window.setTimeout(() => setMessage(null), 6000);
      });
    },
    [reload, t]
  );

  const deleteClient = useCallback(
    (c: ClientRow) => {
      if (isProtectedClient(c.name, c.slug)) {
        window.alert(t("cannotDeleteDefault"));
        return;
      }
      void deleteClients([c.id], () => window.confirm(t("deleteConfirm", { name: c.name })));
    },
    [deleteClients, t]
  );

  /**
   * Exclui um cliente já confirmado (sem `window.confirm` — a confirmação fica na UI/modal).
   * Recarrega a lista sem cache e retorna se deu certo.
   */
  const deleteClientConfirmed = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch("/api/clients/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientIds: [id] }),
        cache: "no-store"
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        window.alert(String(j.error ?? t("deleteFailed")));
        return false;
      }
      await reload();
      return true;
    },
    [reload, t]
  );

  return {
    clients: filtered,
    allClients: clients,
    loading,
    search,
    setSearch,
    reload,
    deleteClient,
    deleteClientConfirmed,
    message,
    isPending,
    locale,
    isProtected: isProtectedClient
  };
}
