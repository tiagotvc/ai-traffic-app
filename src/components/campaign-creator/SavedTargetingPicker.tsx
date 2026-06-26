"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

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
  onApply: (targeting: DraftTargeting, audienceName: string, audienceId?: string) => void;
};

export function SavedTargetingPicker({
  clientSlug,
  adAccountId,
  disabled,
  onApply
}: Props) {
  const t = useTranslations("campaignCreator");
  const [items, setItems] = useState<SavedTargetingAudience[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-[var(--text-main)]">{t("savedTargetingTitle")}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{t("savedTargetingHint")}</p>
      </div>

      {!clientSlug || !adAccountId ? (
        <p className="ui-alert-warning text-xs">{t("savedAudiencesNeedAccount")}</p>
      ) : loading ? (
        <p className="text-xs text-[var(--text-dim)]">{t("savedTargetingLoading")}</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-dim)]">
          {t("savedTargetingEmpty")}
        </p>
      ) : (
        <>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("savedAudiencesSearch")}
            className="ui-input text-xs"
            disabled={disabled}
          />

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-[var(--text-dim)]">
                {t("savedAudiencesNoMatch")}
              </p>
            ) : (
              filtered.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition ${
                    selectedId === a.id
                      ? "bg-[var(--ui-accent-muted)]"
                      : "hover:bg-[var(--surface-bg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="saved-targeting"
                    checked={selectedId === a.id}
                    disabled={disabled}
                    onChange={() => setSelectedId(a.id)}
                    className="mt-0.5 accent-[var(--ui-accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-[var(--text-main)]">{a.name}</span>
                    {a.storage === "local" ? (
                      <span className="ml-1.5 rounded bg-[var(--ui-accent-muted)] px-1.5 py-0.5 text-[10px] text-[var(--ui-accent)]">
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
            disabled={disabled || !selected}
            onClick={apply}
            className="ui-btn-secondary-accent text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("savedTargetingApply")}
          </button>
        </>
      )}
    </div>
  );
}
