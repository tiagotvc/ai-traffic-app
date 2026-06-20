"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  AdsCreatorClient,
  type AdsCreatorFooterState
} from "@/components/AdsCreatorClient";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";

export function PublishCampaignSidebar({ onPublished }: { onPublished?: () => void }) {
  const t = useTranslations("ads");
  const tCommon = useTranslations("common");
  const { open, options, closePanel } = usePublishPanel();
  const [footer, setFooter] = useState<AdsCreatorFooterState | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t("closePanel")}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={closePanel}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-[var(--border-color)] bg-[var(--surface-card)] shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
          <div>
            <p className="text-xs font-medium text-[var(--violet)]">{t("sidebarKicker")}</p>
            <h2 className="font-heading text-lg font-bold text-[var(--text-main)]">{t("sidebarTitle")}</h2>
            <p className="mt-1 text-xs text-[var(--text-dim)]">{t("sidebarSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="rounded-lg p-2 text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)]"
          >
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <AdsCreatorClient
            embedded
            initialClientSlug={options.clientSlug}
            onFooterState={setFooter}
            onPublished={() => {
              onPublished?.();
              closePanel();
            }}
          />
        </div>
        <footer className="shrink-0 border-t border-[var(--border-color)] bg-[var(--surface-card)] px-5 py-4">
          <button
            type="button"
            disabled={footer?.publishDisabled ?? true}
            onClick={() => footer?.publish()}
            className="ui-btn-primary w-full disabled:opacity-60"
          >
            {footer?.isPending ? tCommon("sending") : t("publishCampaign")}
          </button>
        </footer>
      </aside>
    </>
  );
}
