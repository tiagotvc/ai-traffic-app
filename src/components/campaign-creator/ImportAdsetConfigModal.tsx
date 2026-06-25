"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { ImportedAdConfig } from "@/lib/campaign-ad-import";
import type { AdSetDraftItem } from "@/lib/campaign-draft";
import {
  useImportTreeLoader,
  type ImportTreeItem
} from "@/components/campaign-creator/useImportTreeLoader";

type Step = "campaigns" | "adsets";

type ImportResult = {
  adset: Partial<AdSetDraftItem>;
  ads?: ImportedAdConfig[];
  adsetName: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  clientSlug: string;
  adAccountId: string;
  defaultCampaignId?: string;
  onImport: (result: ImportResult) => void;
  inline?: boolean;
};

export function ImportAdsetConfigModal({
  open,
  onClose,
  clientSlug,
  adAccountId,
  defaultCampaignId,
  onImport,
  inline = false
}: Props) {
  const t = useTranslations("campaignCreator");
  const panelRef = useRef<HTMLDivElement>(null);
  const { items, loading, error, setError, fetchLevel, clearCache } = useImportTreeLoader(
    clientSlug,
    adAccountId
  );
  const [step, setStep] = useState<Step>("campaigns");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [includeAds, setIncludeAds] = useState(false);
  const navRef = useRef({ step, campaignId });

  navRef.current = { step, campaignId };

  function loadCurrent(q?: string) {
    const { step: s, campaignId: cId } = navRef.current;
    if (s === "campaigns") return fetchLevel({ level: "campaigns", q });
    if (s === "adsets" && cId) return fetchLevel({ level: "adsets", campaignId: cId, q });
  }

  useEffect(() => {
    if (!open) return;
    clearCache();
    setSelectedId(null);
    setSearch("");
    setError(null);
    setIncludeAds(false);
    setCampaignId(defaultCampaignId ?? null);
    setCampaignName("");

    if (defaultCampaignId) {
      setStep("adsets");
      void fetchLevel({ level: "adsets", campaignId: defaultCampaignId });
    } else {
      setStep("campaigns");
      void fetchLevel({ level: "campaigns" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCampaignId]);

  useEffect(() => {
    if (!open || !search.trim()) return;
    const timer = setTimeout(() => void loadCurrent(search), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open]);

  useEffect(() => {
    if (!open || !inline) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-import-adset-trigger]")) return;
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
  const emptyMessage =
    step === "campaigns" && !search.trim() ? t("importAdEmptyScoped") : t("importAdEmpty");

  function pickCampaign(item: ImportTreeItem) {
    setCampaignId(item.id);
    setCampaignName(item.name);
    setSelectedId(null);
    setSearch("");
    setStep("adsets");
    void fetchLevel({ level: "adsets", campaignId: item.id });
  }

  function goBack() {
    setSearch("");
    setSelectedId(null);
    setError(null);
    if (step === "adsets") {
      setStep("campaigns");
      setCampaignId(null);
      setCampaignName("");
      void fetchLevel({ level: "campaigns" });
    }
  }

  async function runImport() {
    if (!selectedId) return;
    setImporting(true);
    setError(null);
    try {
      const params = includeAds ? "?includeAds=true" : "";
      const res = await fetch(
        `/api/campaign-creator/import-adset/${encodeURIComponent(selectedId)}${params}`
      );
      const j = (await res.json()) as {
        ok?: boolean;
        adset?: Partial<AdSetDraftItem>;
        ads?: ImportedAdConfig[];
        adsetName?: string;
        error?: string;
      };
      if (!j.ok || !j.adset) throw new Error(j.error ?? "importFailed");
      onImport({
        adset: j.adset,
        ads: j.ads,
        adsetName: j.adsetName ?? selected?.name ?? selectedId
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "importFailed");
    } finally {
      setImporting(false);
    }
  }

  const stepLabel = step === "campaigns" ? t("importAdStepCampaign") : t("importAdStepAdset");

  const panel = (
    <div
      ref={panelRef}
      className={`flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] shadow-lg ${
        inline ? "max-h-[min(520px,70vh)]" : "max-h-[min(640px,90vh)] max-w-lg"
      }`}
    >
      <div className="border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {step !== "campaigns" ? (
              <button
                type="button"
                onClick={goBack}
                className="text-xs font-medium text-[var(--violet)] hover:underline"
              >
                ← {t("importAdBack")}
              </button>
            ) : null}
            <h2 className="font-heading mt-1 text-sm font-semibold text-[var(--text-main)]">
              {t("importAdsetTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("importAdsetHint")}</p>
            <p className="mt-2 text-[11px] font-medium text-[var(--violet)]">{stepLabel}</p>
            {campaignName ? (
              <p className="text-[10px] text-[var(--text-dimmer)]">{campaignName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)]"
            aria-label={t("importAdCancel")}
          >
            ×
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--border-color)] p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("importAdSearch")}
          className="ui-input w-full text-sm"
        />
      </div>

      <div className="min-h-[200px] flex-1 overflow-y-auto p-2">
        {loading && items.length === 0 ? (
          <p className="p-4 text-center text-xs text-[var(--text-dim)]">{t("importAdLoading")}</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-xs text-[var(--text-dim)]">{emptyMessage}</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (step === "campaigns") pickCampaign(item);
                    else setSelectedId(item.id);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left text-sm transition ${
                    step === "adsets" && selectedId === item.id
                      ? "border-violet-400 bg-[rgba(124,58,237,0.06)]"
                      : "border-[var(--border-color)] hover:bg-[var(--surface-bg)]"
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-bg)] text-[10px] text-[var(--text-dimmer)]">
                    {step === "campaigns" ? "C" : "J"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--text-main)]">{item.name}</div>
                    <div className="truncate text-[11px] text-[var(--text-dim)]">
                      {item.status ?? item.id}
                      {item.objective ? ` · ${item.objective}` : ""}
                    </div>
                  </div>
                  {step === "campaigns" ? (
                    <span className="shrink-0 text-[var(--text-dimmer)]">›</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="px-4 text-xs text-red-600">{error}</p> : null}

      {step === "adsets" ? (
        <div className="space-y-2 border-t border-[var(--border-color)] p-4">
          {selected ? (
            <p className="text-[11px] text-[var(--text-dim)]">
              {t("importAdSelected", { name: selected.name })}
            </p>
          ) : (
            <p className="text-[11px] text-[var(--text-dimmer)]">{t("importAdPickAdset")}</p>
          )}
          <label className="flex cursor-pointer items-start gap-2 text-xs text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={includeAds}
              onChange={(e) => setIncludeAds(e.target.checked)}
              className="mt-0.5 accent-violet-600"
            />
            <span>{t("importAdsetIncludeAds")}</span>
          </label>
          <button
            type="button"
            disabled={!selectedId || importing}
            onClick={() => void runImport()}
            className="ui-btn-primary w-full text-xs disabled:opacity-50"
          >
            {importing ? t("importAdsetImporting") : t("importAdsetImportBtn")}
          </button>
        </div>
      ) : (
        <div className="border-t border-[var(--border-color)] p-4">
          <p className="text-[11px] text-[var(--text-dimmer)]">{t("importAdPickCampaign")}</p>
        </div>
      )}
    </div>
  );

  if (inline) {
    return <div className="absolute left-0 right-0 top-full z-20 mt-2">{panel}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {panel}
    </div>
  );
}
