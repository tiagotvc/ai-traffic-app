"use client";

import { useCallback, useEffect, useState } from "react";

import type { TargetingItem } from "@/components/MetaTargetingSelect";

export function useClientPublishDefaults(clientSlug: string, locale: string) {
  const [publishReady, setPublishReady] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [defaultPageId, setDefaultPageId] = useState("");
  const [defaultTargeting, setDefaultTargeting] = useState<{
    locations: TargetingItem[];
    ageMin: number;
    ageMax: number;
    includeAud: string[];
    excludeAud: string[];
  } | null>(null);

  const regionNames = (() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  })();

  const load = useCallback(async () => {
    if (!clientSlug) {
      setPublishReady(false);
      setLinkUrl("");
      setDefaultPageId("");
      setDefaultTargeting(null);
      return;
    }
    try {
      const [publishRes, settingsRes] = await Promise.all([
        fetch(`/api/clients/${encodeURIComponent(clientSlug)}/publish-config`),
        fetch(`/api/clients/${encodeURIComponent(clientSlug)}/meta-settings`)
      ]);
      const publishJson = (await publishRes.json()) as {
        resolved?: { ready?: boolean; linkUrl?: string | null; metaPageId?: string | null };
      };
      setPublishReady(!!publishJson.resolved?.ready);
      setLinkUrl(publishJson.resolved?.linkUrl ?? "");
      setDefaultPageId(publishJson.resolved?.metaPageId ?? "");

      const sj = (await settingsRes.json()) as {
        settings?: {
          targeting?: { countries?: string[]; age_min?: number; age_max?: number };
          defaultCustomAudienceIds?: string[];
          defaultExcludedAudienceIds?: string[];
        };
      };
      const s = sj.settings;
      const countries = s?.targeting?.countries ?? [];
      setDefaultTargeting({
        locations: countries.map((code) => ({
          value: code,
          label: regionNames?.of(code) ?? code,
          meta: { type: "country" as const, countryCode: code }
        })),
        ageMin: s?.targeting?.age_min ?? 18,
        ageMax: s?.targeting?.age_max ?? 65,
        includeAud: s?.defaultCustomAudienceIds ?? [],
        excludeAud: s?.defaultExcludedAudienceIds ?? []
      });
    } catch {
      setPublishReady(false);
    }
  }, [clientSlug, regionNames]);

  useEffect(() => {
    void load();
  }, [load]);

  return { publishReady, linkUrl, defaultPageId, defaultTargeting, reload: load };
}
