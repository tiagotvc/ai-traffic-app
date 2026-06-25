"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { ImportedAdConfig } from "@/lib/campaign-ad-import";
import {
  useImportTreeLoader,
  type ImportTreeItem,
  type ImportTreeLevel
} from "@/components/campaign-creator/useImportTreeLoader";

type Step = ImportTreeLevel;

type Props = {
  open: boolean;
  onClose: () => void;
  clientSlug: string;
  adAccountId: string;
  defaultCampaignId?: string;
  defaultAdsetId?: string;
  onImport: (imported: ImportedAdConfig, mode: "copy" | "media" | "all") => void;
  onImportMany?: (imported: ImportedAdConfig[], mode: "copy" | "media" | "all") => void;
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
  onImportMany,
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [adsetId, setAdsetId] = useState<string | null>(null);
  const [adsetName, setAdsetName] = useState("");
  const navRef = useRef({ step, campaignId, adsetId });

  navRef.current = { step, campaignId, adsetId };

  function loadCurrent(q?: string) {
    const { step: s, campaignId: cId, adsetId: aId } = navRef.current;
    if (s === "campaigns") return fetchLevel({ level: "campaigns", q });
    if (s === "adsets" && cId) return fetchLevel({ level: "adsets", campaignId: cId, q });
    if (s === "ads" && aId) {
      return fetchLevel({ level: "ads", campaignId: cId ?? undefined, adsetId: aId, q });
    }
  }

  useEffect(() => {
    if (!open) return;
    clearCache();
    setSelectedIds(new Set());
    setSearch("");
    setError(null);
    setCampaignId(defaultCampaignId ?? null);
    setAdsetId(defaultAdsetId ?? null);
    setCampaignName("");
    setAdsetName("");

    if (defaultCampaignId && defaultAdsetId) {
      setStep("ads");
      void fetchLevel({
        level: "ads",
        campaignId: defaultCampaignId,
        adsetId: defaultAdsetId
      });
    } else if (defaultCampaignId) {
      setStep("adsets");
      void fetchLevel({ level: "adsets", campaignId: defaultCampaignId });
    } else {
      setStep("campaigns");
      void fetchLevel({ level: "campaigns" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultAdsetId, defaultCampaignId]);

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

  const selectedCount = selectedIds.size;
  const allAdsSelected = step === "ads" && items.length > 0 && selectedCount === items.length;

  function toggleAdSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllAds() {
    if (allAdsSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.id)));
  }

  function pickCampaign(item: ImportTreeItem) {
    setCampaignId(item.id);
    setCampaignName(item.name);
    setAdsetId(null);
    setAdsetName("");
    setSelectedIds(new Set());
    setSearch("");
    setStep("adsets");
    void fetchLevel({ level: "adsets", campaignId: item.id });
  }

  function pickAdset(item: ImportTreeItem) {
    setAdsetId(item.id);
    setAdsetName(item.name);
    setSelectedIds(new Set());
    setSearch("");
    setStep("ads");
    void fetchLevel({ level: "ads", campaignId: campaignId ?? undefined, adsetId: item.id });
  }

  function goBack() {
    setSearch("");
    setSelectedIds(new Set());
    setError(null);
    if (step === "ads") {
      setStep("adsets");
      setAdsetId(null);
      setAdsetName("");
      if (campaignId) void fetchLevel({ level: "adsets", campaignId });
      return;
    }
    if (step === "adsets") {
      setStep("campaigns");
      setCampaignId(null);
      setCampaignName("");
      void fetchLevel({ level: "campaigns" });
    }
  }

  async function runImport(mode: "copy" | "media" | "all") {
    if (selectedCount === 0) return;
    setImporting(true);
    setError(null);
    try {
      const results = await Promise.all(
        [...selectedIds].map(async (id) => {
          const res = await fetch(`/api/campaign-creator/import-ad/${encodeURIComponent(id)}`);
          const j = (await res.json()) as {
            ok?: boolean;
            imported?: ImportedAdConfig;
            error?: string;
          };
          if (!j.ok || !j.imported) throw new Error(j.error ?? "importFailed");
          return j.imported;
        })
      );
      if (results.length === 1) onImport(results[0]!, mode);
      else if (onImportMany) onImportMany(results, mode);
      else onImport(results[0]!, mode);
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

  const emptyMessage =
    step === "campaigns" && !search.trim() ? t("importAdEmptyScoped") : t("importAdEmpty");

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
              {t("importAdTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("importAdHint")}</p>
            <p className="mt-2 text-[11px] font-medium text-[var(--violet)]">{stepLabel}</p>
            {campaignName ? (
              <p className="text-[10px] text-[var(--text-dimmer)]">
                {campaignName}
                {adsetName ? ` › ${adsetName}` : ""}
              </p>
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
          <>
            {step === "ads" ? (
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={selectAllAds}
                  className="text-[11px] font-medium text-[var(--violet)] hover:underline"
                >
                  {t("importAdSelectAll")}
                </button>
                {selectedCount > 0 ? (
                  <span className="text-[11px] text-[var(--text-dim)]">
                    {t("importAdMultiCount", { count: selectedCount })}
                  </span>
                ) : null}
              </div>
            ) : null}
            <ul className="space-y-1">
              {items.map((item) => {
                const isAdStep = step === "ads";
                const isSelected = selectedIds.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (step === "campaigns") pickCampaign(item);
                        else if (step === "adsets") pickAdset(item);
                        else toggleAdSelection(item.id);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left text-sm transition ${
                        isAdStep && isSelected
                          ? "border-violet-400 bg-[rgba(124,58,237,0.06)]"
                          : "border-[var(--border-color)] hover:bg-[var(--surface-bg)]"
                      }`}
                    >
                      {isAdStep ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          tabIndex={-1}
                          className="shrink-0 accent-violet-600"
                          aria-hidden
                        />
                      ) : null}
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
                      {!isAdStep ? (
                        <span className="shrink-0 text-[var(--text-dimmer)]">›</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {error ? <p className="px-4 text-xs text-red-600">{error}</p> : null}

      {step === "ads" ? (
        <div className="space-y-2 border-t border-[var(--border-color)] p-4">
          {selectedCount > 0 ? (
            <p className="text-[11px] text-[var(--text-dim)]">
              {t("importAdMultiCount", { count: selectedCount })}
            </p>
          ) : (
            <p className="text-[11px] text-[var(--text-dimmer)]">{t("importAdSelect")}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={selectedCount === 0 || importing}
              onClick={() => void runImport("copy")}
              className="ui-btn-secondary flex-1 text-xs disabled:opacity-50"
            >
              {t("importAdCopy")}
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || importing}
              onClick={() => void runImport("media")}
              className="ui-btn-secondary flex-1 text-xs disabled:opacity-50"
            >
              {t("importAdMedia")}
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || importing}
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
