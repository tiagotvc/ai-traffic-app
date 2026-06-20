"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { AudienceCreateContext, AudienceOptions } from "./types";

type Props = {
  ctx: AudienceCreateContext;
  onBack: () => void;
};

export function WebsiteAudienceWizard({ ctx, onBack }: Props) {
  const t = useTranslations("audiences");
  const [pending, startTransition] = useTransition();
  const [options, setOptions] = useState<AudienceOptions | null>(null);
  const [pixelId, setPixelId] = useState("");
  const [eventName, setEventName] = useState("PageView");
  const [retentionDays, setRetentionDays] = useState(30);
  const [urlContains, setUrlContains] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const qs = new URLSearchParams({
      clientId: ctx.clientSlug,
      adAccountId: ctx.adAccountId,
      type: "website"
    });
    fetch(`/api/meta/audience-creation/options?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setOptions(j as AudienceOptions);
          setPixelId(j.pixels?.[0]?.id ?? "");
        }
      })
      .catch(() => ctx.onError(t("optionsLoadFailed")));
  }, [ctx, t]);

  const events = options?.websiteEvents ?? [];
  const maxDays = options?.websiteMaxRetentionDays ?? 180;

  const defaultName = useMemo(() => {
    const ev = events.find((e) => e.metaEvent === eventName);
    return `${ev?.metaEvent ?? eventName} — ${retentionDays}d`;
  }, [events, eventName, retentionDays]);

  const submit = () => {
    startTransition(async () => {
      const res = await fetch("/api/meta/audiences/website", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: ctx.clientSlug,
          adAccountId: ctx.adAccountId,
          name: name.trim() || defaultName,
          pixelId,
          eventName,
          retentionDays,
          urlContains: urlContains.trim() || undefined
        })
      });
      const j = await res.json();
      if (j.ok) {
        ctx.onSuccess(t("websiteCreated"));
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
        <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("createType.website.title")}</h2>
        <button type="button" onClick={onBack} className="ui-btn-secondary text-sm">
          {t("back")}
        </button>
      </div>

      {!options ? (
        <p className="text-sm text-[var(--text-dim)]">{t("loadingOptions")}</p>
      ) : !options.pixels.length ? (
        <p className="text-sm text-amber-700">{t("noPixels")}</p>
      ) : (
        <>
          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("selectPixel")}</label>
            <select
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              className="ui-select mt-1 w-full"
            >
              {options.pixels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("selectEvent")}</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setEventName(ev.metaEvent)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                    eventName === ev.metaEvent
                      ? "border-violet-500 bg-[rgba(124,58,237,0.06)] text-[var(--violet)]"
                      : "border-[var(--border-color)]"
                  }`}
                >
                  {ev.isCustom ? ev.labelKey : t(ev.labelKey as "websiteEvent.pageView")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">
              {t("retentionDays")} ({retentionDays}d, max {maxDays})
            </label>
            <input
              type="range"
              min={1}
              max={maxDays}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <div className="mt-1 flex flex-wrap gap-2">
              {[7, 14, 30, 60, 90, 180].filter((d) => d <= maxDays).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRetentionDays(d)}
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    retentionDays === d ? "border-violet-500 bg-[rgba(124,58,237,0.06)]" : "border-[var(--border-color)]"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("urlFilterOptional")}</label>
            <input
              value={urlContains}
              onChange={(e) => setUrlContains(e.target.value)}
              placeholder={t("urlFilterPlaceholder")}
              className="ui-input mt-1 w-full text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("audienceName")}</label>
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
              disabled={pending || !pixelId}
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
