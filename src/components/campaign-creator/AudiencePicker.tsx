"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { PublishAudience } from "@/hooks/usePublishAssets";
import { cn } from "@/lib/cn";

type Props = {
  audiences: PublishAudience[];
  loading?: boolean;
  adAccountId?: string;
  includeIds: string[];
  excludeIds: string[];
  onChangeInclude: (ids: string[]) => void;
  onChangeExclude: (ids: string[]) => void;
  disabled?: boolean;
  /** Omit outer card chrome when rendered inside a modal. */
  embedded?: boolean;
};

function subtypeLabel(subtype?: string) {
  if (!subtype) return null;
  const s = subtype.toUpperCase();
  if (s.includes("LOOKALIKE")) return "Lookalike";
  if (s.includes("CUSTOM")) return "Custom";
  if (s.includes("ENGAGEMENT")) return "Engagement";
  if (s.includes("WEBSITE")) return "Website";
  return subtype;
}

export function AudiencePicker({
  audiences,
  loading,
  adAccountId,
  includeIds,
  excludeIds,
  onChangeInclude,
  onChangeExclude,
  disabled,
  embedded = false
}: Props) {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState<"include" | "exclude">("include");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return audiences;
    return audiences.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.id.includes(q) ||
        (a.subtype ?? "").toLowerCase().includes(q)
    );
  }, [audiences, filter]);

  const activeIds = mode === "include" ? includeIds : excludeIds;
  const onChange = mode === "include" ? onChangeInclude : onChangeExclude;

  function toggle(id: string) {
    if (activeIds.includes(id)) {
      onChange(activeIds.filter((x) => x !== id));
    } else {
      onChange([...activeIds, id]);
    }
  }

  const modeBtnClass = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-1.5 text-xs font-medium transition",
      active
        ? "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)]"
        : "bg-[var(--surface-card)] text-[var(--text-dim)] ring-1 ring-[var(--border-color)] hover:ring-[var(--ui-accent-border)]"
    );

  return (
    <div
      className={cn(
        "space-y-3",
        !embedded && "rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3"
      )}
    >
      {!embedded ? (
        <div>
          <p className="text-sm font-semibold text-[var(--text-main)]">{t("savedAudiencesTitle")}</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{t("savedAudiencesHint")}</p>
        </div>
      ) : null}

      {!adAccountId ? (
        <p className="rounded-lg border border-[var(--border-color)] bg-[var(--ui-accent-muted)] px-3 py-2 text-xs text-[var(--text-main)]">
          {t("savedAudiencesNeedAccount")}
        </p>
      ) : loading ? (
        <p className="text-xs text-[var(--text-dim)]">{t("savedAudiencesLoading")}</p>
      ) : audiences.length === 0 ? (
        <p className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-2 text-xs text-[var(--text-dim)]">
          {t("savedAudiencesEmpty")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("include")}
              className={modeBtnClass(mode === "include")}
            >
              {tAds("audienceInclude")} ({includeIds.length})
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("exclude")}
              className={modeBtnClass(mode === "exclude")}
            >
              {tAds("audienceExclude")} ({excludeIds.length})
            </button>
          </div>

          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("savedAudiencesSearch")}
            className="ui-input text-xs"
            disabled={disabled}
          />

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-[var(--text-dim)]">
                {t("savedAudiencesNoMatch")}
              </p>
            ) : (
              filtered.map((a) => {
                const checked = activeIds.includes(a.id);
                const inOther =
                  mode === "include"
                    ? excludeIds.includes(a.id)
                    : includeIds.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition",
                      checked
                        ? "bg-[var(--ui-accent-muted)]"
                        : "hover:bg-[var(--row-hover)]",
                      inOther && "opacity-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || inOther}
                      onChange={() => toggle(a.id)}
                      className="mt-0.5 accent-[var(--ui-accent)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-[var(--text-main)]">{a.name}</span>
                      {a.subtype ? (
                        <span className="ml-1.5 rounded bg-[var(--surface-card)] px-1.5 py-0.5 text-[10px] text-[var(--text-dim)]">
                          {subtypeLabel(a.subtype)}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--text-dimmer)]">
                        {a.id}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {includeIds.length > 0 || excludeIds.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {includeIds.map((id) => {
                const a = audiences.find((x) => x.id === id);
                return (
                  <span
                    key={`inc-${id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] text-[var(--ui-accent)]"
                  >
                    + {a?.name ?? id}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChangeInclude(includeIds.filter((x) => x !== id))}
                      className="text-[var(--ui-accent)] opacity-70 hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              {excludeIds.map((id) => {
                const a = audiences.find((x) => x.id === id);
                return (
                  <span
                    key={`exc-${id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--surface-bg)] px-2 py-0.5 text-[10px] text-[var(--text-dim)]"
                  >
                    − {a?.name ?? id}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChangeExclude(excludeIds.filter((x) => x !== id))}
                      className="text-[var(--text-dim)] hover:text-[var(--text-main)]"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
