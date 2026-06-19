"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Abre abaixo do botão, sem overlay em tela cheia. */
  inline?: boolean;
};

export function ImportAdConfigModal({
  open,
  onClose,
  clientSlug,
  adAccountId,
  defaultCampaignId,
  defaultAdsetId,
  onImport,
  inline = false
}: Props) {
  const t = useTranslations("campaignCreator");
  const panelRef = useRef<HTMLDivElement>(null);
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
      else if (step === "ads" && adsetId)
        loadLevel("ads", { campaignId: campaignId ?? undefined, adsetId, q: search });
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, step, search, campaignId, adsetId, loadLevel]);

  useEffect(() => {
    if (!open || !inline) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-import-ad-trigger]")) return;
      onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, inline, onClose]);

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

  const panel = (
    <div
      ref={panelRef}
      className={`flex w-full flex-col overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-lg ${
        inline ? "max-h-[min(520px,70vh)]" : "max-h-[min(640px,90vh)] max-w-lg"
      }`}
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {step !== "campaigns" ? (
              <button
                type="button"
                onClick={goBack}
                className="text-xs font-medium text-violet-600 hover:underline"
              >
                ← {t("importAdBack")}
              </button>
            ) : null}
            <h2 className="mt-1 text-sm font-semibold text-slate-900">{t("importAdTitle")}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t("importAdHint")}</p>
            <p className="mt-2 text-[11px] font-medium text-violet-700">{stepLabel}</p>
            {campaignName ? (
              <p className="text-[10px] text-slate-400">
                {campaignName}
                {adsetName ? ` › ${adsetName}` : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("importAdCancel")}
          >
            ×
          </button>
        </div>
      </div>

      <div className="border-b border-slate-100 p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("importAdSearch")}
          className="ui-input w-full text-sm"
        />
      </div>

      <div className="min-h-[200px] flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="p-4 text-center text-xs text-slate-500">{t("importAdLoading")}</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-500">{t("importAdEmpty")}</p>
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
                      ? "border-violet-400 bg-violet-50"
                      : "border-slate-100 hover:bg-slate-50"
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">
                      {step === "campaigns" ? "C" : step === "adsets" ? "J" : "Ad"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-900">{item.name}</div>
                    <div className="truncate text-[11px] text-slate-500">
                      {item.status ?? item.id}
                      {item.objective ? ` · ${item.objective}` : ""}
                    </div>
                  </div>
                  {step !== "ads" ? <span className="shrink-0 text-slate-300">›</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="px-4 text-xs text-red-600">{error}</p> : null}

      {step === "ads" ? (
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
        </div>
      ) : (
        <div className="border-t border-slate-100 p-4">
          <p className="text-[11px] text-slate-400">
            {step === "campaigns" ? t("importAdPickCampaign") : t("importAdPickAdset")}
          </p>
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="absolute left-0 right-0 top-full z-20 mt-2">
        {panel}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {panel}
    </div>
  );
}
