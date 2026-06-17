"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { ImportedAdConfig } from "@/lib/campaign-ad-import";

type AccountAdRow = {
  id: string;
  name: string;
  status?: string;
  campaignName?: string;
  adsetName?: string;
  thumbnailUrl?: string;
  creativeType?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  clientSlug: string;
  adAccountId: string;
  onImport: (imported: ImportedAdConfig, mode: "copy" | "media" | "all") => void;
};

export function ImportAdConfigModal({
  open,
  onClose,
  clientSlug,
  adAccountId,
  onImport
}: Props) {
  const t = useTranslations("campaignCreator");
  const [search, setSearch] = useState("");
  const [ads, setAds] = useState<AccountAdRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadAds = useCallback(() => {
    if (!clientSlug || !adAccountId) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      clientId: clientSlug,
      adAccountId
    });
    if (search.trim()) params.set("q", search.trim());
    fetch(`/api/campaign-creator/account-ads?${params}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; ads?: AccountAdRow[]; error?: string }) => {
        if (!j.ok) throw new Error(j.error ?? "loadFailed");
        setAds(j.ads ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "loadFailed");
        setAds([]);
      })
      .finally(() => setLoading(false));
  }, [adAccountId, clientSlug, search]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => loadAds(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, loadAds, search]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setSearch("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const selected = ads.find((a) => a.id === selectedId);

  async function runImport(mode: "copy" | "media" | "all") {
    if (!selectedId) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaign-creator/import-ad/${encodeURIComponent(selectedId)}`);
      const j = (await res.json()) as {
        ok?: boolean;
        imported?: ImportedAdConfig;
        error?: string;
      };
      if (!j.ok || !j.imported) throw new Error(j.error ?? "importFailed");
      onImport(j.imported, mode);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "importFailed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[min(640px,90vh)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">{t("importAdTitle")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t("importAdHint")}</p>
        </div>

        <div className="border-b border-slate-100 p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("importAdSearch")}
            className="ui-input w-full text-sm"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="p-4 text-center text-xs text-slate-500">{t("importAdLoading")}</p>
          ) : ads.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500">{t("importAdEmpty")}</p>
          ) : (
            <ul className="space-y-1">
              {ads.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left text-sm transition ${
                      selectedId === a.id
                        ? "border-violet-400 bg-violet-50"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    {a.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.thumbnailUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">
                        Ad
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">{a.name}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        {a.campaignName}
                        {a.adsetName ? ` · ${a.adsetName}` : ""}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? <p className="px-4 text-xs text-red-600">{error}</p> : null}

        <div className="space-y-2 border-t border-slate-100 p-4">
          {selected ? (
            <p className="text-[11px] text-slate-500">{t("importAdSelected", { name: selected.name })}</p>
          ) : (
            <p className="text-[11px] text-slate-400">{t("importAdSelect")}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!selectedId || importing}
              onClick={() => void runImport("copy")}
              className="ui-btn-secondary flex-1 text-xs disabled:opacity-50"
            >
              {t("importAdCopy")}
            </button>
            <button
              type="button"
              disabled={!selectedId || importing}
              onClick={() => void runImport("media")}
              className="ui-btn-secondary flex-1 text-xs disabled:opacity-50"
            >
              {t("importAdMedia")}
            </button>
            <button
              type="button"
              disabled={!selectedId || importing}
              onClick={() => void runImport("all")}
              className="ui-btn-primary flex-1 text-xs disabled:opacity-50"
            >
              {importing ? t("importAdImporting") : t("importAdAll")}
            </button>
          </div>
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full text-xs">
            {t("importAdCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
