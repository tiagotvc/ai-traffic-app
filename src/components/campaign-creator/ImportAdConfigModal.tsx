"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ImportedAdConfig } from "@/lib/campaign-ad-import";
import {
  useImportTreeLoader,
  type ImportTreeItem,
  type ImportTreeLevel
} from "@/components/campaign-creator/useImportTreeLoader";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { DsButton } from "@/design-system";

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
};

export function ImportAdConfigModal({
  open,
  onClose,
  clientSlug,
  adAccountId,
  defaultCampaignId,
  defaultAdsetId,
  onImport,
  onImportMany
}: Props) {
  const t = useTranslations("campaignCreator");
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

  const footer =
    step === "ads" ? (
      <footer className="flex shrink-0 flex-col gap-3 border-t border-[var(--border-color)] px-5 py-3">
        <p className="text-[11px] text-[var(--text-dim)]">
          {selectedCount > 0
            ? t("importAdMultiCount", { count: selectedCount })
            : t("importAdSelect")}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DsButton variant="secondary" size="sm" onClick={onClose}>
            {t("modalCancel")}
          </DsButton>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DsButton
              variant="secondary"
              size="sm"
              disabled={selectedCount === 0 || importing}
              onClick={() => void runImport("copy")}
            >
              {t("importAdCopy")}
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              disabled={selectedCount === 0 || importing}
              onClick={() => void runImport("media")}
            >
              {t("importAdMedia")}
            </DsButton>
            <DsButton
              variant="accent"
              size="sm"
              disabled={selectedCount === 0 || importing}
              onClick={() => void runImport("all")}
            >
              {importing ? t("importAdImporting") : t("importAdAll")}
            </DsButton>
          </div>
        </div>
      </footer>
    ) : (
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] px-5 py-3">
        <p className="text-[11px] text-[var(--text-dimmer)]">
          {step === "campaigns" ? t("importAdPickCampaign") : t("importAdPickAdset")}
        </p>
        <DsButton variant="secondary" size="sm" onClick={onClose}>
          {t("modalCancel")}
        </DsButton>
      </footer>
    );

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("importAdTitle")}
      subtitle={t("importAdHint")}
      titleIcon={<Download size={16} />}
      width="lg"
      className="max-h-[min(720px,92vh)]"
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      footer={footer}
    >
      <div className="shrink-0 border-b border-[var(--border-color)] px-5 py-3">
        {step !== "campaigns" ? (
          <button
            type="button"
            onClick={goBack}
            className="mb-2 text-xs font-medium text-[var(--ui-accent)] hover:underline"
          >
            ← {t("importAdBack")}
          </button>
        ) : null}
        <p className="text-[11px] font-medium text-[var(--ui-accent)]">{stepLabel}</p>
        {campaignName ? (
          <p className="text-[10px] text-[var(--text-dimmer)]">
            {campaignName}
            {adsetName ? ` › ${adsetName}` : ""}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-b border-[var(--border-color)] px-5 py-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("importAdSearch")}
          className="ui-input w-full text-sm"
        />
      </div>

      <div className="relative min-h-[240px] flex-1 overflow-y-auto p-3">
        {loading ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[var(--surface-card)]/75 text-xs text-[var(--text-dim)] backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ui-accent)] border-t-transparent"
              aria-hidden
            />
            {t("importAdLoading")}
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="p-4 text-center text-xs text-[var(--text-dim)]">{emptyMessage}</p>
        ) : (
          <>
            {step === "ads" ? (
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={selectAllAds}
                  className="text-[11px] font-medium text-[var(--ui-accent)] hover:underline"
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
                      disabled={loading}
                      onClick={() => {
                        if (step === "campaigns") pickCampaign(item);
                        else if (step === "adsets") pickAdset(item);
                        else toggleAdSelection(item.id);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left text-sm transition disabled:cursor-not-allowed ${
                        isAdStep && isSelected
                          ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]"
                          : "border-[var(--border-color)] hover:bg-[var(--surface-bg)]"
                      }`}
                    >
                      {isAdStep ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          tabIndex={-1}
                          className="shrink-0 accent-[var(--ui-accent)]"
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
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-bg)] text-xs text-[var(--text-dimmer)]">
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

      {error ? <p className="shrink-0 px-5 pb-3 text-xs text-red-600">{error}</p> : null}
    </CreatorModalShell>
  );
}
