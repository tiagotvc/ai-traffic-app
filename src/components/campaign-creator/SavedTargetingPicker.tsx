"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { mapMetaTargetingToDraft } from "@/lib/meta-adset-import";
import type { DraftTargeting } from "@/lib/campaign-draft";

export type SavedTargetingAudience = {
  id: string;
  name: string;
  targeting: Record<string, unknown>;
  storage?: "meta" | "local";
};

type Props = {
  clientSlug: string;
  adAccountId: string;
  disabled?: boolean;
  compact?: boolean;
  hideHeader?: boolean;
  modalMode?: boolean;
  selectedId?: string | null;
  applying?: boolean;
  onApply: (targeting: DraftTargeting, audienceName: string, audienceId?: string) => void;
};

export function SavedTargetingPicker({
  clientSlug,
  adAccountId,
  disabled,
  compact,
  hideHeader,
  modalMode,
  selectedId: selectedIdProp,
  applying,
  onApply
}: Props) {
  const t = useTranslations("campaignCreator");
  const [items, setItems] = useState<SavedTargetingAudience[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(selectedIdProp ?? null);

  useEffect(() => {
    if (selectedIdProp !== undefined) {
      setSelectedId(selectedIdProp);
    }
  }, [selectedIdProp]);

  useEffect(() => {
    if (!clientSlug || !adAccountId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const qs = new URLSearchParams({
      clientId: clientSlug,
      adAccountId
    });
    fetch(`/api/meta/saved-audiences?${qs}`)
      .then((r) => r.json())
      .then(
        (j: {
          ok?: boolean;
          audiences?: Array<{
            id: string;
            name: string;
            targeting?: Record<string, unknown>;
            storage?: "meta" | "local";
          }>;
        }) => {
          if (!j.ok) {
            setItems([]);
            return;
          }
          setItems(
            (j.audiences ?? [])
              .filter((a) => a.targeting && Object.keys(a.targeting).length > 0)
              .map((a) => ({
                id: a.id,
                name: a.name,
                targeting: a.targeting ?? {},
                storage: a.storage
              }))
          );
        }
      )
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [clientSlug, adAccountId]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
    );
  }, [items, filter]);

  const selected = items.find((a) => a.id === selectedId);

  function apply() {
    if (!selected) return;
    onApply(mapMetaTargetingToDraft(selected.targeting), selected.name, selected.id);
  }

  const listMaxHeight = modalMode ? "max-h-72" : compact ? "max-h-28" : "max-h-48";

  return (
    <div className={compact || modalMode ? "space-y-2" : "space-y-3"}>
      {!hideHeader ? (
        <div>
          <p className="text-sm font-semibold text-[var(--text-main)]">{t("savedTargetingTitle")}</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{t("savedTargetingHint")}</p>
        </div>
      ) : null}

      {!clientSlug || !adAccountId ? (
        <p className="ui-alert-warning text-xs">{t("savedAudiencesNeedAccount")}</p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-dim)]">
          <Loader2 size={18} className="animate-spin" />
          <span>{t("savedTargetingLoading")}</span>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-2.5 py-2 text-xs text-[var(--text-dim)]">
          {t("savedTargetingEmpty")}
        </p>
      ) : (
        <>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("savedAudiencesSearch")}
            className={`ui-input ${compact || modalMode ? "py-1.5 text-xs" : "text-xs"}`}
            disabled={disabled || applying}
          />

          <div
            className={`space-y-0.5 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-1 ${listMaxHeight}`}
          >
            {filtered.length === 0 ? (
              <p className="px-2 py-2 text-center text-xs text-[var(--text-dim)]">
                {t("savedAudiencesNoMatch")}
              </p>
            ) : (
              filtered.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 transition ${
                    compact || modalMode ? "py-1 text-xs" : "items-start rounded-lg py-1.5 text-xs"
                  } ${
                    selectedId === a.id
                      ? "bg-[var(--ui-accent-muted)]"
                      : "hover:bg-[var(--surface-bg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="saved-targeting"
                    checked={selectedId === a.id}
                    disabled={disabled || applying}
                    onChange={() => setSelectedId(a.id)}
                    className="shrink-0 accent-[var(--ui-accent)]"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-main)]">
                    {a.name}
                    {a.storage === "local" ? (
                      <span className="ml-1.5 rounded bg-[var(--ui-accent-muted)] px-1 py-0.5 text-[10px] font-normal text-[var(--ui-accent)]">
                        {t("savedTargetingLocalBadge")}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))
            )}
          </div>

          <button
            type="button"
            disabled={disabled || applying || !selected}
            onClick={apply}
            className={`ui-btn-secondary-accent inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              compact || modalMode ? "py-1.5 text-xs" : "text-xs"
            }`}
          >
            {applying ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("savedAudienceApplying")}
              </>
            ) : compact ? (
              t("savedTargetingApplyShort")
            ) : (
              t("savedTargetingApply")
            )}
          </button>
        </>
      )}
    </div>
  );
}
