"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  clientSlug: string;
  adAccountId: string;
  onBlocked?: (blocked: boolean) => void;
};

export function TosBanner({ clientSlug, adAccountId, onBlocked }: Props) {
  const t = useTranslations("audiences");
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(true);
  const [tosUrl, setTosUrl] = useState("https://www.facebook.com/ads/manage/customaudiences/tos/");

  const checkTos = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ adAccountId });
      const res = await fetch(`/api/meta/terms-status?${qs}`);
      const j = await res.json();
      const custom = (j.terms ?? []).find((x: { id: string }) => x.id === "custom_audience");
      setAccepted(custom?.status === "accepted");
      if (custom?.url) setTosUrl(custom.url);
    } catch {
      setAccepted(false);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  useEffect(() => {
    void checkTos();
  }, [clientSlug, checkTos]);

  useEffect(() => {
    const onFocus = () => {
      void checkTos();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkTos]);

  useEffect(() => {
    onBlocked?.(!loading && !accepted);
  }, [loading, accepted, onBlocked]);

  if (loading || accepted) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">{t("tosRequiredTitle")}</p>
      <p className="mt-1 text-xs">{t("tosRequiredBody")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <a
          href={tosUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-violet-700 underline"
        >
          {t("tosAcceptLink")}
        </a>
        <button
          type="button"
          onClick={() => void checkTos()}
          className="text-xs font-medium text-slate-600 underline hover:text-slate-800"
        >
          {t("tosRecheck")}
        </button>
      </div>
    </div>
  );
}
