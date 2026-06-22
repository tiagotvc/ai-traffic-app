"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type MetaSettingsResponse = {
  ok: boolean;
  oauthRedirectUri?: string;
  requestOrigin?: string;
  redirectUris?: string[];
};

export function MetaOAuthRedirectHint() {
  const t = useTranslations("settings");
  const [data, setData] = useState<MetaSettingsResponse | null>(null);

  useEffect(() => {
    fetch("/api/settings/meta")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setData(j as MetaSettingsResponse);
      })
      .catch(() => setData(null));
  }, []);

  if (!data?.redirectUris?.length) return null;

  const primary = data.oauthRedirectUri ?? data.redirectUris[0];

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-950">
      <p className="font-semibold">{t("metaOAuthRedirectTitle")}</p>
      <p className="mt-1 text-amber-900/90">{t("metaOAuthRedirectHint")}</p>
      {data.requestOrigin ? (
        <p className="mt-2 text-[11px] text-amber-900/80">
          {t("metaOAuthRedirectOrigin", { origin: data.requestOrigin })}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] font-medium text-amber-900">{t("metaOAuthRedirectPrimary")}</p>
      <code className="mt-1 block break-all rounded bg-black/10 px-2 py-1 text-[10px]">{primary}</code>
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] font-medium text-amber-900">
          {t("metaOAuthRedirectAll")}
        </summary>
        <ul className="mt-2 space-y-1">
          {data.redirectUris.map((uri) => (
            <li key={uri}>
              <code className="block break-all rounded bg-black/10 px-2 py-1 text-[10px]">{uri}</code>
            </li>
          ))}
        </ul>
      </details>
      <a
        href="https://developers.facebook.com/apps/"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-[11px] font-medium underline"
      >
        developers.facebook.com/apps
      </a>
    </div>
  );
}
