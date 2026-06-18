"use client";

import { useCallback, useEffect, useState } from "react";

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
export type PublishAudience = { id: string; name: string };

export function usePublishAssets(clientSlug: string, adAccountId: string) {
  const [accounts, setAccounts] = useState<PublishAdAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [assets, setAssets] = useState<PublishAsset[]>([]);
  const [pages, setPages] = useState<PublishPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<PublishIgAccount[]>([]);
  const [pixels, setPixels] = useState<PublishPixel[]>([]);
  const [customConversions, setCustomConversions] = useState<PublishCustomConversion[]>([]);
  const [audiences, setAudiences] = useState<PublishAudience[]>([]);
  const [defaultAdAccountId, setDefaultAdAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssets = useCallback(async (slug: string, accountId: string) => {
    if (!slug || !accountId) {
      setAssets([]);
      setPages([]);
      setInstagramAccounts([]);
      setPixels([]);
      setAudiences([]);
      return;
    }
    const qs = `?clientId=${encodeURIComponent(slug)}&adAccountId=${encodeURIComponent(accountId)}`;
    const res = await fetch(`/api/meta/assets${qs}`);
    const j = (await res.json()) as {
      ok?: boolean;
      assets?: PublishAsset[];
      pages?: PublishPage[];
      instagramAccounts?: PublishIgAccount[];
      pixels?: PublishPixel[];
      customConversions?: PublishCustomConversion[];
      error?: string;
    };
    if (!res.ok || !j.ok) {
      setError(j.error ?? "loadFailed");
      setAssets([]);
      setPages([]);
      return;
    }
    setAssets(j.assets ?? []);
    setPages(j.pages ?? []);
    setInstagramAccounts(j.instagramAccounts ?? []);
    setPixels(j.pixels ?? []);
    setCustomConversions(j.customConversions ?? []);

    try {
      const aud = await fetch(
        `/api/meta/audiences?adAccountId=${encodeURIComponent(accountId)}`
      ).then((r) => r.json());
      setAudiences(
        ((aud.audiences ?? []) as Array<{ id: string; name?: string }>).map((a) => ({
          id: a.id,
          name: a.name?.trim() || a.id
        }))
      );
    } catch {
      setAudiences([]);
    }
  }, []);

  const loadForClient = useCallback(
    async (slug: string) => {
      if (!slug) {
        setAccounts([]);
        setDefaultAdAccountId(null);
        setAssets([]);
        setPages([]);
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
        if (first) await loadAssets(slug, first);
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
    else {
      setAccounts([]);
      setAssets([]);
      setPages([]);
    }
  }, [clientSlug, loadForClient]);

  useEffect(() => {
    if (clientSlug && adAccountId) void loadAssets(clientSlug, adAccountId);
  }, [clientSlug, adAccountId, loadAssets]);

  return {
    accounts,
    accountsLoading,
    assets,
    pages,
    instagramAccounts,
    pixels,
    customConversions,
    audiences,
    defaultAdAccountId,
    error,
    loadForClient,
    loadAssets: (accountId: string) => loadAssets(clientSlug, accountId)
  };
}
