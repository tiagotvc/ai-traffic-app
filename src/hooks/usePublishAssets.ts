"use client";

import { useCallback, useEffect, useState } from "react";

export type PublishAsset = { id: string; label: string; url?: string | null };
export type PublishPage = { metaPageId: string; name: string };
export type PublishIgAccount = { id: string; username: string };
export type PublishPixel = { id: string; name: string };
export type PublishAdAccount = { metaAdAccountId: string; label: string };
export type PublishAudience = { id: string; name: string };

export function usePublishAssets(clientSlug: string, adAccountId: string) {
  const [accounts, setAccounts] = useState<PublishAdAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [assets, setAssets] = useState<PublishAsset[]>([]);
  const [pages, setPages] = useState<PublishPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<PublishIgAccount[]>([]);
  const [pixels, setPixels] = useState<PublishPixel[]>([]);
  const [audiences, setAudiences] = useState<PublishAudience[]>([]);
  const [defaultAdAccountId, setDefaultAdAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssets = useCallback(async (accountId: string) => {
    const qs = accountId ? `?adAccountId=${encodeURIComponent(accountId)}` : "";
    const res = await fetch(`/api/meta/assets${qs}`);
    const j = (await res.json()) as {
      assets?: PublishAsset[];
      pages?: PublishPage[];
      instagramAccounts?: PublishIgAccount[];
      pixels?: PublishPixel[];
    };
    setAssets(j.assets ?? []);
    setPages(j.pages ?? []);
    setInstagramAccounts(j.instagramAccounts ?? []);
    setPixels(j.pixels ?? []);

    if (accountId) {
      try {
        const aud = await fetch(`/api/meta/audiences?adAccountId=${encodeURIComponent(accountId)}`).then(
          (r) => r.json()
        );
        setAudiences(
          ((aud.audiences ?? []) as Array<{ id: string; name?: string }>).map((a) => ({
            id: a.id,
            name: a.name?.trim() || a.id
          }))
        );
      } catch {
        setAudiences([]);
      }
    } else {
      setAudiences([]);
    }
  }, []);

  const loadForClient = useCallback(
    async (slug: string) => {
      if (!slug) {
        setAccounts([]);
        setDefaultAdAccountId(null);
        setAssets([]);
        return null;
      }
      setAccountsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/meta/ad-accounts?clientId=${encodeURIComponent(slug)}`);
        const j = (await res.json()) as {
          ok?: boolean;
          accounts?: PublishAdAccount[];
          defaultAdAccountId?: string | null;
          error?: string;
        };
        if (!res.ok || !j.ok) {
          setAccounts([]);
          setError(j.error ?? "loadFailed");
          return null;
        }
        const list = j.accounts ?? [];
        setAccounts(list);
        const first = j.defaultAdAccountId ?? list[0]?.metaAdAccountId ?? "";
        setDefaultAdAccountId(first || null);
        if (first) await loadAssets(first);
        return first || null;
      } catch {
        setAccounts([]);
        setError("loadFailed");
        return null;
      } finally {
        setAccountsLoading(false);
      }
    },
    [loadAssets]
  );

  useEffect(() => {
    if (clientSlug) void loadForClient(clientSlug);
  }, [clientSlug, loadForClient]);

  useEffect(() => {
    if (adAccountId) void loadAssets(adAccountId);
  }, [adAccountId, loadAssets]);

  return {
    accounts,
    accountsLoading,
    assets,
    pages,
    instagramAccounts,
    pixels,
    audiences,
    defaultAdAccountId,
    error,
    loadForClient,
    loadAssets
  };
}
