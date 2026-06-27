"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Loader2 } from "lucide-react";

import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";
import { UxWizardModalPanel } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

type SourceCampaign = { id: string; name: string; objective?: string; status?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  clientSlug: string;
  selectedId?: string | null;
  onSelect: (campaignId: string, campaignName: string) => void;
};

export function CopyCampaignModal({ open, onClose, clientSlug, selectedId, onSelect }: Props) {
  const t = useTranslations("campaignCreator");
  const [sources, setSources] = useState<SourceCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || !clientSlug) {
      setSources([]);
      return;
    }

    setLoading(true);
    fetch(`/api/campaigns/creator-sources?clientId=${encodeURIComponent(clientSlug)}`)
      .then((r) => r.json())
      .then((j: { campaigns?: SourceCampaign[] }) => setSources(j.campaigns ?? []))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, [open, clientSlug]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filtered = sources.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <UxModalPortal open={open} onClose={onClose}>
      <UxWizardModalPanel size="md" className="max-h-[min(560px,92vh)] max-w-lg">
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                {t("copyCampaignSelect")}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("copyCampaignHint")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-[var(--text-dimmer)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-dim)]"
              aria-label={t("close")}
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!clientSlug ? (
            <p className="text-sm text-[var(--text-dim)]">{t("selectClientFirst")}</p>
          ) : (
            <div className="space-y-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("copyCampaignSelect")}
                className="ui-input w-full text-sm"
              />

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-dim)]">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--text-dim)]">
                  {t("copyCampaignSelect")}
                </p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {filtered.map((campaign) => {
                    const active = selectedId === campaign.id;
                    return (
                      <li key={campaign.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(campaign.id, campaign.name);
                            onClose();
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                            active
                              ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]"
                              : "border-[var(--border-color)] hover:border-[var(--ui-accent-border)] hover:bg-[var(--ui-accent-hover)]"
                          }`}
                        >
                          <span className="min-w-0 truncate font-medium text-[var(--text-main)]">
                            {campaign.name}
                          </span>
                          <ChevronRight size={16} className="shrink-0 text-[var(--ui-accent)]" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </UxWizardModalPanel>
    </UxModalPortal>
  );
}
