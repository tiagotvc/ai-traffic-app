"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PublishAsset = {
  id: string;
  label: string;
  url?: string | null;
  kind?: "image" | "video";
};
export type PublishPage = { metaPageId: string; name: string };
export type PublishIgAccount = { id: string; username: string };
export type PublishPixel = { id: string; name: string };
export type PublishCustomConversion = { id: string; label: string; eventType?: string };
export type PublishAdAccount = { metaAdAccountId: string; label: string };
export type PublishAudience = { id: string; name: string; subtype?: string };

export type PublishAccountsError =
  | "load_failed"
  | "client_not_found"
  | "account_not_linked"
  | "permission_denied"
  | "meta_not_connected";

function classifyAccountsError(error?: string): PublishAccountsError {
  const msg = (error ?? "").toLowerCase();
  if (msg.includes("cliente não encontrado") || msg.includes("client not found")) {
    return "client_not_found";
  }
  if (msg.includes("conta não vinculada") || msg.includes("not linked")) {
    return "account_not_linked";
  }
  if (
    msg.includes("ads_management") ||
    msg.includes("ads_read") ||
    msg.includes("permissão negada") ||
    msg.includes("permission denied") ||
    msg.includes("(#200)")
  ) {
    return "permission_denied";
  }
  if (msg.includes("meta não conectada") || msg.includes("meta not connected")) {
    return "meta_not_connected";
  }
  return "load_failed";
}

export function usePublishAssets(clientSlug: string, adAccountId: string) {
  const [accounts, setAccounts] = useState<PublishAdAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [assets, setAssets] = useState<PublishAsset[]>([]);
  const [pages, setPages] = useState<PublishPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<PublishIgAccount[]>([]);
  const [pixels, setPixels] = useState<PublishPixel[]>([]);
  const [customConversions, setCustomConversions] = useState<PublishCustomConversion[]>([]);
  const [audiences, setAudiences] = useState<PublishAudience[]>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [defaultAdAccountId, setDefaultAdAccountId] = useState<string | null>(null);
  const [accountsError, setAccountsError] = useState<PublishAccountsError | null>(null);
  const [assetsError, setAssetsError] = useState<PublishAccountsError | null>(null);
  const accountsLoadSeq = useRef(0);
  const assetsLoadSeq = useRef(0);

  const loadAudiences = useCallback(async (accountId: string, seq: number) => {
    if (!accountId) {
      setAudiences([]);
      return;
    }
    setAudiencesLoading(true);
    try {
      const res = await fetch(
        `/api/meta/audiences?adAccountId=${encodeURIComponent(accountId)}`
      );
      const aud = (await res.json()) as {
        ok?: boolean;
        audiences?: Array<{ id: string; name?: string; subtype?: string }>;
        error?: string;
      };
      if (seq !== assetsLoadSeq.current) return;
      if (!res.ok || aud.ok === false) {
        setAudiences([]);
        return;
      }
      setAudiences(
        (aud.audiences ?? []).map((a) => ({
          id: a.id,
          name: a.name?.trim() || a.id,
          subtype: a.subtype
        }))
      );
    } catch {
      if (seq === assetsLoadSeq.current) setAudiences([]);
    } finally {
      if (seq === assetsLoadSeq.current) setAudiencesLoading(false);
    }
  }, []);

  const loadAssets = useCallback(
    async (slug: string, accountId: string, linkedAccounts: PublishAdAccount[]) => {
      if (!slug || !accountId) {
        setAssets([]);
        setPages([]);
        setInstagramAccounts([]);
        setPixels([]);
        setCustomConversions([]);
        setAudiences([]);
        setAssetsError(null);
        return;
      }

      if (
        linkedAccounts.length > 0 &&
        !linkedAccounts.some((a) => a.metaAdAccountId === accountId)
      ) {
        setAssets([]);
        setPages([]);
        setAssetsError("account_not_linked");
        return;
      }

      const seq = ++assetsLoadSeq.current;
      setAssetsError(null);

      void loadAudiences(accountId, seq);
      const qs = `?clientId=${encodeURIComponent(slug)}&adAccountId=${encodeURIComponent(accountId)}`;
      try {
        const res = await fetch(`/api/meta/assets${qs}`);
        const j = (await res.json()) as {
          ok?: boolean;
          assets?: PublishAsset[];
          pages?: PublishPage[];
          instagramAccounts?: PublishIgAccount[];
          pixels?: PublishPixel[];
          customConversions?: PublishCustomConversion[];
          error?: string;
          errorCode?: string;
        };
        if (seq !== assetsLoadSeq.current) return;
        if (!res.ok || !j.ok) {
          const code =
            j.errorCode === "ACCOUNT_NOT_LINKED"
              ? "account_not_linked"
              : classifyAccountsError(j.error);
          setAssetsError(code);
          setAssets([]);
          setPages([]);
          setInstagramAccounts([]);
          setPixels([]);
          setCustomConversions([]);
          return;
        }
        setAssets(j.assets ?? []);
        setPages(j.pages ?? []);
        setInstagramAccounts(j.instagramAccounts ?? []);
        setPixels(j.pixels ?? []);
        setCustomConversions(j.customConversions ?? []);
      } catch {
        if (seq === assetsLoadSeq.current) {
          setAssetsError("load_failed");
          setAssets([]);
          setPages([]);
        }
      }
    },
    [loadAudiences]
  );

  const loadForClient = useCallback(async (slug: string) => {
    if (!slug) {
      setAccounts([]);
      setDefaultAdAccountId(null);
      setAccountsError(null);
      setAssets([]);
      setPages([]);
      setAccountsLoading(false);
      return null;
    }

    const seq = ++accountsLoadSeq.current;
    setAccountsLoading(true);
    setAccountsError(null);

    try {
      const res = await fetch(`/api/meta/ad-accounts?clientId=${encodeURIComponent(slug)}`);
      const j = (await res.json()) as {
        ok?: boolean;
        accounts?: PublishAdAccount[];
        defaultAdAccountId?: string | null;
        error?: string;
      };
      if (seq !== accountsLoadSeq.current) return null;

      if (!res.ok || !j.ok) {
        setAccounts([]);
        setDefaultAdAccountId(null);
        setAccountsError(classifyAccountsError(j.error));
        return null;
      }

      const list = j.accounts ?? [];
      setAccounts(list);
      const first = j.defaultAdAccountId ?? list[0]?.metaAdAccountId ?? "";
      setDefaultAdAccountId(first || null);
      return first || null;
    } catch {
      if (seq === accountsLoadSeq.current) {
        setAccounts([]);
        setDefaultAdAccountId(null);
        setAccountsError("load_failed");
      }
      return null;
    } finally {
      if (seq === accountsLoadSeq.current) setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (clientSlug) void loadForClient(clientSlug);
    else {
      accountsLoadSeq.current += 1;
      setAccounts([]);
      setDefaultAdAccountId(null);
      setAccountsError(null);
      setAssets([]);
      setPages([]);
      setAccountsLoading(false);
    }
  }, [clientSlug, loadForClient]);

  useEffect(() => {
    if (!clientSlug || !adAccountId || accountsLoading) return;
    void loadAssets(clientSlug, adAccountId, accounts);
  }, [clientSlug, adAccountId, accounts, accountsLoading, loadAssets]);

  return {
    accounts,
    accountsLoading,
    assets,
    pages,
    instagramAccounts,
    pixels,
    customConversions,
    audiences,
    audiencesLoading,
    defaultAdAccountId,
    accountsError,
    assetsError,
    /** @deprecated use accountsError or assetsError */
    error: accountsError ?? assetsError,
    loadForClient,
    loadAssets: (accountId: string) => loadAssets(clientSlug, accountId, accounts)
  };
}
