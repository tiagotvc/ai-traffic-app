"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ImportTreeItem = {
  id: string;
  name: string;
  status?: string;
  thumbnailUrl?: string;
  objective?: string;
};

export type ImportTreeLevel = "campaigns" | "adsets" | "ads";

type FetchOpts = {
  level: ImportTreeLevel;
  campaignId?: string;
  adsetId?: string;
  q?: string;
};

function cacheKey(opts: FetchOpts) {
  return [opts.level, opts.campaignId ?? "", opts.adsetId ?? "", opts.q?.trim() ?? ""].join(":");
}

export function useImportTreeLoader(clientSlug: string, adAccountId: string) {
  const [items, setItems] = useState<ImportTreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, ImportTreeItem[]>());

  const fetchLevel = useCallback(
    async (opts: FetchOpts, options?: { useCache?: boolean }) => {
      if (!clientSlug || !adAccountId) return;
      const key = cacheKey(opts);
      if (options?.useCache !== false && cacheRef.current.has(key)) {
        setItems(cacheRef.current.get(key)!);
        setError(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        clientId: clientSlug,
        adAccountId,
        level: opts.level,
        scoped: "1"
      });
      if (opts.campaignId) params.set("campaignId", opts.campaignId);
      if (opts.adsetId) params.set("adsetId", opts.adsetId);
      if (opts.q?.trim()) params.set("q", opts.q.trim());

      try {
        const res = await fetch(`/api/campaign-creator/import-tree?${params}`, {
          signal: controller.signal
        });
        const j = (await res.json()) as {
          ok?: boolean;
          items?: ImportTreeItem[];
          error?: string;
        };
        if (controller.signal.aborted) return;
        if (!j.ok) throw new Error(j.error ?? "loadFailed");
        const next = j.items ?? [];
        cacheRef.current.set(key, next);
        setItems(next);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "loadFailed");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [adAccountId, clientSlug]
  );

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { items, loading, error, setError, fetchLevel, clearCache };
}
