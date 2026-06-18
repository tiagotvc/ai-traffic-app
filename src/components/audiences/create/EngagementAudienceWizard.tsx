"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { AudienceCreateContext, AudienceOptions } from "./types";

type Props = {
  ctx: AudienceCreateContext;
  onBack: () => void;
};

type VideoOriginFilter = "all" | "ad_account" | "page" | "instagram";

export function EngagementAudienceWizard({ ctx, onBack }: Props) {
  const t = useTranslations("audiences");
  const [pending, startTransition] = useTransition();
  const [options, setOptions] = useState<AudienceOptions | null>(null);
  const [sourceType, setSourceType] = useState<"page" | "ig_business" | "video" | "lead">("page");
  const [sourceId, setSourceId] = useState("");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [videoOriginFilter, setVideoOriginFilter] = useState<VideoOriginFilter>("all");
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
  const selectedAction = actions.find((a) => a.metaEvent === eventName);
  const maxDays = selectedAction?.maxRetentionDays ?? 365;
  const fixedRetention = selectedAction?.maxRetentionDays === 0;

  const sourcesForType = useMemo(() => {
    if (!options) return [];
    if (sourceType === "page") return options.pages;
    if (sourceType === "ig_business") return options.instagramAccounts;
    if (sourceType === "lead") return options.leadForms ?? [];
    return [];
  }, [options, sourceType]);

  const filteredVideos = useMemo(() => {
    const videos = options?.engagementVideos ?? [];
    if (videoOriginFilter === "all") return videos;
    return videos.filter((v) => v.origin === videoOriginFilter);
  }, [options?.engagementVideos, videoOriginFilter]);

  useEffect(() => {
    const firstAction = actions[0];
    if (firstAction && !actions.some((a) => a.metaEvent === eventName)) {
      setEventName(firstAction.metaEvent);
    }
  }, [actions, eventName]);

  useEffect(() => {
    if (sourceType === "video") return;
    if (sourcesForType.length && !sourcesForType.some((s) => s.id === sourceId)) {
      setSourceId(sourcesForType[0]?.id ?? "");
    }
    if (!sourcesForType.length) setSourceId("");
  }, [sourcesForType, sourceId, sourceType]);

  useEffect(() => {
    setSelectedVideoIds((prev) => prev.filter((id) => filteredVideos.some((v) => v.id === id)));
  }, [filteredVideos]);

  const defaultName = useMemo(() => {
    const srcLabel = options?.engagementSources?.find((s) => s.id === sourceType);
    const action = actions.find((a) => a.metaEvent === eventName);
    const srcName = srcLabel ? t(srcLabel.labelKey as "engagementSource.page") : sourceType;
    const actionName = action ? t(action.labelKey as "engagementAction.pageEngaged") : eventName;
    return `${srcName} — ${actionName}`;
  }, [actions, eventName, sourceType, options, t]);

  const originLabel = (origin: string, originLabelKey: string) => {
    if (origin === "ad_account") return t("videoOriginAdAccount");
    if (origin === "page") return `${t("videoOriginPage")}: ${originLabelKey}`;
    if (origin === "instagram") return `${t("videoOriginInstagram")}: ${originLabelKey}`;
    return originLabelKey;
  };

  const submit = () => {
    const sourceIds =
      sourceType === "video"
        ? selectedVideoIds
        : sourceId
          ? [sourceId]
          : [];

    if (!sourceIds.length) {
      ctx.onError(
        sourceType === "video" ? t("selectEngagementVideos") : t("selectSourceAsset")
      );
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
          sourceIds,
          eventName,
          retentionDays: fixedRetention ? 0 : Math.min(retentionDays, maxDays)
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

  const canSubmit =
    sourceType === "video"
      ? selectedVideoIds.length > 0
      : sourceType === "lead"
        ? !!sourceId
        : sourceType === "page" || sourceType === "ig_business"
          ? !!sourceId
          : true;

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

          {sourceType === "video" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">{t("videoOriginFilter")}</label>
                <select
                  value={videoOriginFilter}
                  onChange={(e) => setVideoOriginFilter(e.target.value as VideoOriginFilter)}
                  className="ui-select mt-1 w-full text-sm"
                >
                  <option value="all">{t("videoOriginAll")}</option>
                  <option value="ad_account">{t("videoOriginAdAccount")}</option>
                  <option value="page">{t("videoOriginPage")}</option>
                  <option value="instagram">{t("videoOriginInstagram")}</option>
                </select>
              </div>

              {filteredVideos.length ? (
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    {t("selectEngagementVideos")} ({selectedVideoIds.length})
                  </label>
                  <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {filteredVideos.map((v) => {
                      const checked = selectedVideoIds.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-50 ${
                            checked ? "bg-violet-50" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedVideoIds((prev) =>
                                e.target.checked
                                  ? [...prev, v.id]
                                  : prev.filter((id) => id !== v.id)
                              );
                            }}
                            className="mt-0.5 accent-violet-600"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-slate-800">{v.title}</span>
                            <span className="mt-0.5 block text-[10px] text-slate-500">
                              {originLabel(v.origin, v.originLabel)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-amber-700">
                  <p>{t("noEngagementVideos")}</p>
                  <button
                    type="button"
                    onClick={() => void loadOptions()}
                    className="mt-1 text-xs font-medium text-violet-700 underline"
                  >
                    {t("engagementRecheck")}
                  </button>
                </div>
              )}
            </div>
          ) : sourcesForType.length ? (
            <div>
              <label className="text-xs font-medium text-slate-500">
                {sourceType === "lead" ? t("selectLeadForm") : t("selectSourceAsset")}
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="ui-select mt-1 w-full"
              >
                {sourcesForType.map((s) => (
                  <option key={s.id} value={s.id}>
                    {sourceType === "lead" && "pageName" in s
                      ? `${s.name} (${(s as { pageName: string }).pageName})`
                      : s.name}
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
          ) : sourceType === "lead" ? (
            <p className="text-sm text-amber-700">{t("noLeadForms")}</p>
          ) : null}

          <div>
            <label className="text-xs font-medium text-slate-500">{t("selectEngagementAction")}</label>
            <select
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="ui-select mt-1 w-full text-sm"
            >
              {actions.map((a) => (
                <option key={a.id} value={a.metaEvent}>
                  {t(a.labelKey as "engagementAction.pageEngaged")}
                </option>
              ))}
            </select>
          </div>

          {fixedRetention ? (
            <p className="text-xs text-slate-500">{t("pageLikedRetentionNote")}</p>
          ) : (
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
          )}

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
              disabled={pending || !canSubmit}
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
