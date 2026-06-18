"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { PublishAudience } from "@/hooks/usePublishAssets";

type Props = {
  audiences: PublishAudience[];
  loading?: boolean;
  adAccountId?: string;
  includeIds: string[];
  excludeIds: string[];
  onChangeInclude: (ids: string[]) => void;
  onChangeExclude: (ids: string[]) => void;
  disabled?: boolean;
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
  disabled
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

  return (
    <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/30 p-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{t("savedAudiencesTitle")}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{t("savedAudiencesHint")}</p>
      </div>

      {!adAccountId ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("savedAudiencesNeedAccount")}
        </p>
      ) : loading ? (
        <p className="text-xs text-slate-500">{t("savedAudiencesLoading")}</p>
      ) : audiences.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          {t("savedAudiencesEmpty")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("include")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                mode === "include"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {tAds("audienceInclude")} ({includeIds.length})
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setMode("exclude")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                mode === "exclude"
                  ? "bg-slate-700 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
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

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-slate-500">
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
                    className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition ${
                      checked ? "bg-violet-50" : "hover:bg-slate-50"
                    } ${inOther ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || inOther}
                      onChange={() => toggle(a.id)}
                      className="mt-0.5 accent-violet-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-slate-800">{a.name}</span>
                      {a.subtype ? (
                        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          {subtypeLabel(a.subtype)}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">
                        {a.id}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {(includeIds.length > 0 || excludeIds.length > 0) ? (
            <div className="flex flex-wrap gap-1">
              {includeIds.map((id) => {
                const a = audiences.find((x) => x.id === id);
                return (
                  <span
                    key={`inc-${id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-800"
                  >
                    + {a?.name ?? id}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChangeInclude(includeIds.filter((x) => x !== id))}
                      className="text-violet-500 hover:text-violet-800"
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
                    className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700"
                  >
                    − {a?.name ?? id}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChangeExclude(excludeIds.filter((x) => x !== id))}
                      className="text-slate-500 hover:text-slate-800"
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
