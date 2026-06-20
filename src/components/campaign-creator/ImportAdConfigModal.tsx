"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { ImportedAdConfig } from "@/lib/campaign-ad-import";

type TreeItem = {
  id: string;
  name: string;
  status?: string;
  thumbnailUrl?: string;
  objective?: string;
};

type Step = "campaigns" | "adsets" | "ads";

type Props = {
  open: boolean;
  onClose: () => void;
  clientSlug: string;
  adAccountId: string;
  defaultCampaignId?: string;
  defaultAdsetId?: string;
  onImport: (imported: ImportedAdConfig, mode: "copy" | "media" | "all") => void;
};

export function ImportAdConfigModal({
  open,
  onClose,
  clientSlug,
  adAccountId,
  defaultCampaignId,
  defaultAdsetId,
  onImport
}: Props) {
  const t = useTranslations("campaignCreator");
  const [step, setStep] = useState<Step>("campaigns");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [adsetId, setAdsetId] = useState<string | null>(null);
  const [adsetName, setAdsetName] = useState("");

  const loadLevel = useCallback(
    (level: Step, opts?: { campaignId?: string; adsetId?: string; q?: string }) => {
      if (!clientSlug || !adAccountId) return;
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        clientId: clientSlug,
        adAccountId,
        level
      });
      if (opts?.campaignId) params.set("campaignId", opts.campaignId);
      if (opts?.adsetId) params.set("adsetId", opts.adsetId);
      if (opts?.q?.trim()) params.set("q", opts.q.trim());

      fetch(`/api/campaign-creator/import-tree?${params}`)
        .then((r) => r.json())
        .then((j: { ok?: boolean; items?: TreeItem[]; error?: string }) => {
          if (!j.ok) throw new Error(j.error ?? "loadFailed");
          setItems(j.items ?? []);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "loadFailed");
          setItems([]);
        })
        .finally(() => setLoading(false));
    },
    [adAccountId, clientSlug]
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setSearch("");
    setError(null);
    setCampaignId(defaultCampaignId ?? null);
    setAdsetId(defaultAdsetId ?? null);
    setCampaignName("");
    setAdsetName("");

    if (defaultCampaignId && defaultAdsetId) {
      setStep("ads");
      loadLevel("ads", { campaignId: defaultCampaignId, adsetId: defaultAdsetId });
    } else if (defaultCampaignId) {
      setStep("adsets");
      loadLevel("adsets", { campaignId: defaultCampaignId });
    } else {
      setStep("campaigns");
      loadLevel("campaigns");
    }
  }, [open, defaultAdsetId, defaultCampaignId, loadLevel]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (step === "campaigns") loadLevel("campaigns", { q: search });
      else if (step === "adsets" && campaignId) loadLevel("adsets", { campaignId, q: search });
      else if (step === "ads" && adsetId) loadLevel("ads", { campaignId: campaignId ?? undefined, adsetId, q: search });
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, step, search, campaignId, adsetId, loadLevel]);

  if (!open) return null;

  const selected = items.find((a) => a.id === selectedId);

  function pickCampaign(item: TreeItem) {
    setCampaignId(item.id);
    setCampaignName(item.name);
    setAdsetId(null);
    setAdsetName("");
    setSelectedId(null);
    setSearch("");
    setStep("adsets");
    loadLevel("adsets", { campaignId: item.id });
  }

  function pickAdset(item: TreeItem) {
    setAdsetId(item.id);
    setAdsetName(item.name);
    setSelectedId(null);
    setSearch("");
    setStep("ads");
    loadLevel("ads", { campaignId: campaignId ?? undefined, adsetId: item.id });
  }

  function goBack() {
    setSearch("");
    setSelectedId(null);
    setError(null);
    if (step === "ads") {
      setStep("adsets");
      setAdsetId(null);
      setAdsetName("");
      if (campaignId) loadLevel("adsets", { campaignId });
      return;
    }
    if (step === "adsets") {
      setStep("campaigns");
      setCampaignId(null);
      setCampaignName("");
      loadLevel("campaigns");
    }
  }

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

  const stepLabel =
    step === "campaigns"
      ? t("importAdStepCampaign")
      : step === "adsets"
        ? t("importAdStepAdset")
        : t("importAdStepAd");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[min(640px,90vh)] w-full max-w-lg flex-col rounded-2xl bg-[var(--surface-card)] shadow-xl">
        <div className="border-b border-[var(--border-color)] px-4 py-3">
          <div className="flex items-center gap-2">
            {step !== "campaigns" ? (
              <button
                type="button"
                onClick={goBack}
                className="text-xs font-medium text-[var(--violet)] hover:underline"
              >
                ← {t("importAdBack")}
              </button>
            ) : null}
          </div>
          <h2 className="font-heading mt-1 text-sm font-semibold text-[var(--text-main)]">{t("importAdTitle")}</h2>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("importAdHint")}</p>
          <p className="mt-2 text-[11px] font-medium text-[var(--violet)]">{stepLabel}</p>
          {campaignName ? (
            <p className="text-[10px] text-[var(--text-dimmer)]">
              {campaignName}
              {adsetName ? ` › ${adsetName}` : ""}
            </p>
          ) : null}
        </div>

        <div className="border-b border-[var(--border-color)] p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("importAdSearch")}
            className="ui-input w-full text-sm"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="p-4 text-center text-xs text-[var(--text-dim)]">{t("importAdLoading")}</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-center text-xs text-[var(--text-dim)]">{t("importAdEmpty")}</p>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (step === "campaigns") pickCampaign(item);
                      else if (step === "adsets") pickAdset(item);
                      else setSelectedId(item.id);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left text-sm transition ${
                      step === "ads" && selectedId === item.id
                        ? "border-violet-400 bg-[rgba(124,58,237,0.06)]"
                        : "border-[var(--border-color)] hover:bg-[var(--surface-bg)]"
                    }`}
                  >
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-bg)] text-[10px] text-[var(--text-dimmer)]">
                        {step === "campaigns" ? "C" : step === "adsets" ? "J" : "Ad"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-[var(--text-main)]">{item.name}</div>
                      <div className="truncate text-[11px] text-[var(--text-dim)]">
                        {item.status ?? item.id}
                        {item.objective ? ` · ${item.objective}` : ""}
                      </div>
                    </div>
                    {step !== "ads" ? (
                      <span className="shrink-0 text-[var(--text-dimmer)]">›</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? <p className="px-4 text-xs text-red-600">{error}</p> : null}

        {step === "ads" ? (
          <div className="space-y-2 border-t border-[var(--border-color)] p-4">
            {selected ? (
              <p className="text-[11px] text-[var(--text-dim)]">{t("importAdSelected", { name: selected.name })}</p>
            ) : (
              <p className="text-[11px] text-[var(--text-dimmer)]">{t("importAdSelect")}</p>
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
          </div>
        ) : (
          <div className="border-t border-[var(--border-color)] p-4">
            <p className="text-[11px] text-[var(--text-dimmer)]">
              {step === "campaigns" ? t("importAdPickCampaign") : t("importAdPickAdset")}
            </p>
          </div>
        )}

        <div className="border-t border-[var(--border-color)] p-4 pt-0">
          <button type="button" onClick={onClose} className="ui-btn-secondary w-full text-xs">
            {t("importAdCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
