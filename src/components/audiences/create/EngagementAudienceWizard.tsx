"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { AudienceCreateContext, AudienceOptions } from "./types";

type Props = {
  ctx: AudienceCreateContext;
  onBack: () => void;
};

export function EngagementAudienceWizard({ ctx, onBack }: Props) {
  const t = useTranslations("audiences");
  const [pending, startTransition] = useTransition();
  const [options, setOptions] = useState<AudienceOptions | null>(null);
  const [sourceType, setSourceType] = useState<"page" | "ig_business" | "video" | "lead">("page");
  const [sourceId, setSourceId] = useState("");
  const [eventName, setEventName] = useState("");
  const [retentionDays, setRetentionDays] = useState(30);
  const [name, setName] = useState("");

  useEffect(() => {
    void loadOptions();
  }, [ctx.clientSlug, ctx.adAccountId]);

  function loadOptions() {
    const qs = new URLSearchParams({
      clientId: ctx.clientSlug,
      adAccountId: ctx.adAccountId,
      type: "engagement"
    });
    return fetch(`/api/meta/audience-creation/options?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setOptions(j as AudienceOptions);
      })
      .catch(() => ctx.onError(t("optionsLoadFailed")));
  }

  const actions = options?.engagementActions?.[sourceType] ?? [];
  const maxDays = actions.find((a) => a.metaEvent === eventName)?.maxRetentionDays ?? 365;

  const sourcesForType = useMemo(() => {
    if (!options) return [];
    if (sourceType === "page") return options.pages;
    if (sourceType === "ig_business") return options.instagramAccounts;
    return [];
  }, [options, sourceType]);

  useEffect(() => {
    const firstAction = actions[0];
    if (firstAction && !actions.some((a) => a.metaEvent === eventName)) {
      setEventName(firstAction.metaEvent);
    }
  }, [actions, eventName]);

  useEffect(() => {
    if (sourcesForType.length && !sourcesForType.some((s) => s.id === sourceId)) {
      setSourceId(sourcesForType[0]?.id ?? "");
    }
    if (!sourcesForType.length) setSourceId("");
  }, [sourcesForType, sourceId]);

  const defaultName = useMemo(() => {
    const srcLabel = options?.engagementSources?.find((s) => s.id === sourceType);
    const action = actions.find((a) => a.metaEvent === eventName);
    const srcName = srcLabel ? t(srcLabel.labelKey as "engagementSource.page") : sourceType;
    const actionName = action ? t(action.labelKey as "engagementAction.pageEngaged") : eventName;
    return `${srcName} — ${actionName}`;
  }, [actions, eventName, sourceType, options, t]);

  const submit = () => {
    if (!sourceId && sourceType !== "video") {
      ctx.onError(t("selectSourceAsset"));
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/meta/audiences/engagement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: ctx.clientSlug,
          adAccountId: ctx.adAccountId,
          name: name.trim() || defaultName,
          sourceType,
          sourceId: sourceId || ctx.adAccountId,
          eventName,
          retentionDays: Math.min(retentionDays, maxDays)
        })
      });
      const j = await res.json();
      if (j.ok) {
        ctx.onSuccess(t("engagementCreated"));
        ctx.onRefresh();
        onBack();
      } else {
        ctx.onError(j.error ?? t("createdFailed"));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t("createType.engagement.title")}</h2>
        <button type="button" onClick={onBack} className="ui-btn-secondary text-sm">
          {t("back")}
        </button>
      </div>

      {!options ? (
        <p className="text-sm text-slate-500">{t("loadingOptions")}</p>
      ) : (
        <>
          <div>
            <label className="text-xs font-medium text-slate-500">{t("engagementSourceLabel")}</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(options.engagementSources ?? []).map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => setSourceType(src.id as typeof sourceType)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                    sourceType === src.id
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200"
                  }`}
                >
                  {t(src.labelKey as "engagementSource.page")}
                </button>
              ))}
            </div>
          </div>

          {sourcesForType.length ? (
            <div>
              <label className="text-xs font-medium text-slate-500">{t("selectSourceAsset")}</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="ui-select mt-1 w-full"
              >
                {sourcesForType.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : sourceType === "page" || sourceType === "ig_business" ? (
            <div className="text-sm text-amber-700">
              <p>{t("noEngagementAssets")}</p>
              <button
                type="button"
                onClick={() => void loadOptions()}
                className="mt-1 text-xs font-medium text-violet-700 underline"
              >
                {t("engagementRecheck")}
              </button>
            </div>
          ) : null}

          <div>
            <label className="text-xs font-medium text-slate-500">{t("selectEngagementAction")}</label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setEventName(a.metaEvent)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-medium ${
                    eventName === a.metaEvent
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200"
                  }`}
                >
                  {t(a.labelKey as "engagementAction.pageEngaged")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">
              {t("retentionDays")} ({retentionDays}d, max {maxDays})
            </label>
            <input
              type="range"
              min={1}
              max={maxDays}
              value={Math.min(retentionDays, maxDays)}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">{t("audienceName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              className="ui-input mt-1 w-full text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={pending || ((sourceType === "page" || sourceType === "ig_business") && !sourceId)}
              onClick={submit}
              className="ui-btn-primary"
            >
              {pending ? t("creating") : t("createAudience")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
