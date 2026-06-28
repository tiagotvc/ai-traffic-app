"use client";

import { useTranslations } from "next-intl";

import type { PublishPage, PublishWhatsappNumber } from "@/hooks/usePublishAssets";
import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";
import { UxWizardModalPanel } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

type Props = {
  open: boolean;
  onClose: () => void;
  numbers: PublishWhatsappNumber[];
  pages: PublishPage[];
  loading?: boolean;
  selectedUrl: string;
  onSelect: (waMeUrl: string) => void;
};

export function WhatsappNumbersModal({
  open,
  onClose,
  numbers,
  pages,
  loading = false,
  selectedUrl,
  onSelect
}: Props) {
  const t = useTranslations("campaignCreator");

  if (!open) return null;

  function pageName(pageId: string) {
    return pages.find((p) => p.metaPageId === pageId)?.name ?? pageId;
  }

  return (
    <UxModalPortal open={open} onClose={onClose}>
      <UxWizardModalPanel size="lg" className="max-h-[min(640px,92vh)] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">
              {t("whatsappModalTitle")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{t("whatsappModalHint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-dimmer)] hover:text-[var(--text-dim)]"
            aria-label={t("whatsappModalClose")}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div
              className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-3 text-xs text-[var(--text-dim)]"
              aria-busy="true"
            >
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--ui-accent)] border-t-transparent" />
              {t("whatsappModalLoading")}
            </div>
          ) : numbers.length === 0 ? (
            <p className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-4 text-center text-xs text-[var(--text-dim)]">
              {t("whatsappModalEmpty")}
            </p>
          ) : (
            numbers.map((w) => {
              const selected = w.waMeUrl === selectedUrl;
              return (
                <button
                  key={w.waMeUrl}
                  type="button"
                  onClick={() => {
                    onSelect(w.waMeUrl);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition ${
                    selected
                      ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]"
                      : "border-[var(--border-color)] hover:bg-[var(--surface-bg)]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-main)]">{w.phone}</div>
                    <div className="truncate text-[11px] text-[var(--text-dim)]">
                      {pageName(w.pageId)}
                      {w.isBusiness ? ` · ${t("whatsappModalBusiness")}` : ""}
                    </div>
                  </div>
                  {selected ? (
                    <span className="shrink-0 text-xs font-semibold text-[var(--ui-accent)]">
                      {t("whatsappModalSelected")}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="ui-btn-primary text-sm">
            {t("whatsappModalDone")}
          </button>
        </div>
      </UxWizardModalPanel>
    </UxModalPortal>
  );
}
