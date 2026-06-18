"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { AudienceCreateContext } from "./types";

type Suggestion = {
  title: string;
  description: string;
  type: string;
  name: string;
  payload: Record<string, unknown>;
  reason?: string;
};

type Props = {
  ctx: AudienceCreateContext;
  onBack: () => void;
};

export function AiAudienceWizard({ ctx, onBack }: Props) {
  const t = useTranslations("audiences");
  const [pending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(3);
  const [baseIds, setBaseIds] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);

  const generate = () => {
    startTransition(async () => {
      const res = await fetch("/api/ai/audience-suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: ctx.clientSlug,
          adAccountId: ctx.adAccountId,
          baseAudienceIds: baseIds,
          prompt,
          count
        })
      });
      const j = await res.json();
      if (j.ok) {
        setSuggestions(j.suggestions ?? []);
        setSelected(new Set((j.suggestions ?? []).map((_: unknown, i: number) => i)));
      } else {
        ctx.onError(j.error ?? t("aiFailed"));
      }
    });
  };

  const createSelected = async () => {
    setCreating(true);
    let created = 0;
    for (const idx of selected) {
      const s = suggestions[idx];
      if (!s) continue;
      try {
        let res: Response;
        const base = {
          clientId: ctx.clientSlug,
          adAccountId: ctx.adAccountId,
          name: s.name
        };
        if (s.type === "website") {
          res = await fetch("/api/meta/audiences/website", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...base, ...s.payload })
          });
        } else if (s.type === "engagement") {
          res = await fetch("/api/meta/audiences/engagement", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...base, ...s.payload })
          });
        } else if (s.type === "lookalike") {
          res = await fetch(`/api/clients/${encodeURIComponent(ctx.clientSlug)}/lookalike`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              adAccountId: ctx.adAccountId,
              name: s.name,
              originAudienceId: s.payload.originAudienceId,
              ratio: s.payload.ratio,
              country: s.payload.country ?? "BR"
            })
          });
        } else if (s.type === "combined") {
          res = await fetch("/api/meta/audiences/combine", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              ...base,
              includeAudienceIds: s.payload.includeAudienceIds,
              excludeAudienceIds: s.payload.excludeAudienceIds
            })
          });
        } else if (s.type === "saved_targeting") {
          res = await fetch("/api/meta/saved-audiences", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...base, targeting: s.payload.targeting })
          });
        } else {
          continue;
        }
        const j = await res.json();
        if (j.ok) created++;
      } catch {
        /* skip failed */
      }
    }
    setCreating(false);
    if (created > 0) {
      ctx.onSuccess(t("aiCreatedCount", { count: created }));
      ctx.onRefresh();
      onBack();
    } else {
      ctx.onError(t("aiCreateNone"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t("createType.ai.title")}</h2>
        <button type="button" onClick={onBack} className="ui-btn-secondary text-sm">
          {t("back")}
        </button>
      </div>

      <p className="text-xs text-slate-500">{t("aiDesc")}</p>

      <div>
        <label className="text-xs font-medium text-slate-500">{t("aiBaseAudiences")}</label>
        <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
          {ctx.audiences.slice(0, 30).map((a) => (
            <label key={a.id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={baseIds.includes(a.id)}
                onChange={() =>
                  setBaseIds((prev) =>
                    prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                  )
                }
              />
              <span className="truncate text-sm">{a.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">{t("aiPrompt")}</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder={t("aiPromptPlaceholder")}
          className="ui-input mt-1 w-full text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">{t("aiCount")}</label>
        <input
          type="number"
          min={1}
          max={5}
          value={count}
          onChange={(e) => setCount(Math.min(5, Math.max(1, Number(e.target.value))))}
          className="ui-input mt-1 w-24 text-sm"
        />
      </div>

      <button
        type="button"
        disabled={pending || prompt.trim().length < 3}
        onClick={generate}
        className="ui-btn-secondary"
      >
        {pending ? t("aiGenerating") : t("aiGenerate")}
      </button>

      {suggestions.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">{t("aiSuggestionsTitle")}</h3>
          {suggestions.map((s, i) => (
            <label
              key={i}
              className="block cursor-pointer rounded-xl border border-slate-200 p-3 hover:border-violet-300"
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    });
                  }}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-slate-900">{s.title}</div>
                  <div className="mt-1 text-xs text-slate-600">{s.description}</div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {s.type} · {s.name}
                  </div>
                  {s.reason ? <div className="mt-1 text-[10px] text-violet-600">{s.reason}</div> : null}
                </div>
              </div>
            </label>
          ))}
          <button
            type="button"
            disabled={creating || selected.size === 0}
            onClick={() => void createSelected()}
            className="ui-btn-primary"
          >
            {creating ? t("creating") : t("aiCreateSelected", { count: selected.size })}
          </button>
        </div>
      ) : null}
    </div>
  );
}
