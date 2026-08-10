"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

const STORAGE_CLIENT_KEY = "orion:audiences:clientSlug";
const STORAGE_ACCOUNT_KEY = "orion:audiences:adAccountId";

export type AudienceScopeAccount = { metaAdAccountId: string; label: string };

export type AudienceScopeClient = {
  id: string;
  slug: string;
  name: string;
  metaPixelId: string | null;
  defaultAdAccountId: string | null;
  adAccounts: AudienceScopeAccount[];
  defaultCustomAudienceIds: string[];
  defaultExcludedAudienceIds: string[];
};

export type AudienceScopeValue = {
  clients: AudienceScopeClient[];
  client: AudienceScopeClient | null;
  clientSlug: string;
  clientName: string;
  /** Invariante: sempre pertence a `client.adAccounts`, ou "". */
  adAccountId: string;
  accountLabel: string;
  accounts: AudienceScopeAccount[];
  setClientSlug: (slug: string) => void;
  setAdAccountId: (id: string) => void;
  metaConnected: boolean;
  loading: boolean;
  /** Pronto para chamar a Meta: cliente + conta resolvidos e Meta conectada. */
  ready: boolean;
  hasNoClients: boolean;
  hasNoAccounts: boolean;
  /** `${clientSlug}:${adAccountId}` — para React `key` e deps de effect. */
  scopeKey: string;
  reload: () => void;
};

const AudienceScopeContext = createContext<AudienceScopeValue | null>(null);

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

type HubResponse = {
  ok?: boolean;
  metaConnected?: boolean;
  clients?: AudienceScopeClient[];
};

export function AudienceScopeProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<AudienceScopeClient[]>([]);
  const [metaConnected, setMetaConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  // Escolha explícita do usuário (ou valor hidratado do localStorage).
  const [wantedClientSlug, setWantedClientSlug] = useState("");
  const [wantedAdAccountId, setWantedAdAccountId] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Hidratação: só em effect de mount, nunca durante o render (evita mismatch SSR).
  useEffect(() => {
    setWantedClientSlug(readStored(STORAGE_CLIENT_KEY));
    setWantedAdAccountId(readStored(STORAGE_ACCOUNT_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/audiences/hub")
      .then((r) => r.json())
      .then((j: HubResponse) => {
        if (cancelled) return;
        setClients(j.clients ?? []);
        setMetaConnected(!!j.metaConnected);
      })
      .catch(() => {
        if (!cancelled) setClients([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  // Resolução derivada: nunca produz uma conta que não pertence ao cliente
  // selecionado — é isso que elimina o 403 "conta não vinculada ao cliente".
  const client = useMemo(() => {
    if (!hydrated || clients.length === 0) return null;
    return (
      clients.find((c) => c.slug === wantedClientSlug) ??
      clients.find((c) => c.adAccounts.length > 0) ??
      clients[0] ??
      null
    );
  }, [clients, wantedClientSlug, hydrated]);

  const adAccountId = useMemo(() => {
    if (!client) return "";
    const owns = (id: string) => client.adAccounts.some((a) => a.metaAdAccountId === id);
    if (wantedAdAccountId && owns(wantedAdAccountId)) return wantedAdAccountId;
    if (client.defaultAdAccountId && owns(client.defaultAdAccountId)) {
      return client.defaultAdAccountId;
    }
    return client.adAccounts[0]?.metaAdAccountId ?? "";
  }, [client, wantedAdAccountId]);

  // Regrava o escopo resolvido (cobre o caso de valor persistido inválido:
  // cliente removido ou conta desvinculada).
  useEffect(() => {
    if (!hydrated || loading) return;
    writeStored(STORAGE_CLIENT_KEY, client?.slug ?? "");
    writeStored(STORAGE_ACCOUNT_KEY, adAccountId);
  }, [hydrated, loading, client?.slug, adAccountId]);

  const setClientSlug = useCallback((slug: string) => {
    setWantedClientSlug(slug);
    // Limpa a conta: o memo acima resolve a padrão do novo cliente no mesmo render.
    setWantedAdAccountId("");
  }, []);

  const setAdAccountId = useCallback((id: string) => {
    setWantedAdAccountId(id);
  }, []);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const value = useMemo<AudienceScopeValue>(() => {
    const clientSlug = client?.slug ?? "";
    const accounts = client?.adAccounts ?? [];
    const accountLabel =
      accounts.find((a) => a.metaAdAccountId === adAccountId)?.label ?? adAccountId;
    return {
      clients,
      client,
      clientSlug,
      clientName: client?.name ?? "",
      adAccountId,
      accountLabel,
      accounts,
      setClientSlug,
      setAdAccountId,
      metaConnected,
      loading: loading || !hydrated,
      ready: !!clientSlug && !!adAccountId && metaConnected,
      hasNoClients: !loading && hydrated && clients.length === 0,
      hasNoAccounts: !!client && accounts.length === 0,
      scopeKey: `${clientSlug}:${adAccountId}`,
      reload
    };
  }, [
    clients,
    client,
    adAccountId,
    setClientSlug,
    setAdAccountId,
    metaConnected,
    loading,
    hydrated,
    reload
  ]);

  return <AudienceScopeContext.Provider value={value}>{children}</AudienceScopeContext.Provider>;
}

export function useAudienceScope() {
  const ctx = useContext(AudienceScopeContext);
  if (!ctx) {
    throw new Error("useAudienceScope must be used within AudienceScopeProvider");
  }
  return ctx;
}

export function useAudienceScopeOptional() {
  return useContext(AudienceScopeContext);
}
