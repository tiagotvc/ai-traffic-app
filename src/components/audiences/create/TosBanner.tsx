"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!adAccountId) return;
    setLoading(true);
    fetch("/api/meta/terms-status")
      .then((r) => r.json())
      .then((j) => {
        const custom = (j.terms ?? []).find((x: { id: string }) => x.id === "custom_audience");
        setAccepted(custom?.status === "accepted");
        if (custom?.url) setTosUrl(custom.url);
      })
      .catch(() => setAccepted(false))
      .finally(() => setLoading(false));
  }, [clientSlug, adAccountId]);

  useEffect(() => {
    onBlocked?.(!loading && !accepted);
  }, [loading, accepted, onBlocked]);

  if (loading || accepted) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">{t("tosRequiredTitle")}</p>
      <p className="mt-1 text-xs">{t("tosRequiredBody")}</p>
      <a
        href={tosUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs font-semibold text-violet-700 underline"
      >
        {t("tosAcceptLink")}
      </a>
    </div>
  );
}
