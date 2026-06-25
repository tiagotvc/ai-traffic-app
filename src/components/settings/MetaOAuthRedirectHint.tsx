"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChevronDown, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

type MetaSettingsResponse = {
  ok: boolean;
  oauthRedirectUri?: string;
  requestOrigin?: string;
  redirectUris?: string[];
};

export function MetaOAuthRedirectHint() {
  const t = useTranslations("settings");
  const [data, setData] = useState<MetaSettingsResponse | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function copyPrimary() {
    try {
      await navigator.clipboard.writeText(primary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
          <ShieldCheck size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
            {t("metaOAuthRedirectTitle")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
            {t("metaOAuthRedirectHint")}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.requestOrigin ? (
              <div className="min-w-0">
                <p className="text-[11px] text-[var(--text-dimmer)]">{t("metaOAuthRedirectOriginLabel")}</p>
                <a
                  href={data.requestOrigin}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-sm font-medium text-[var(--ui-accent)] hover:underline"
                >
                  {data.requestOrigin}
                </a>
              </div>
            ) : null}
            <div className={cn("min-w-0", !data.requestOrigin && "sm:col-span-2")}>
              <p className="text-[11px] text-[var(--text-dimmer)]">{t("metaOAuthRedirectPrimary")}</p>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-dim)]">{primary}</code>
                <button
                  type="button"
                  onClick={copyPrimary}
                  className="shrink-0 rounded-md p-1 text-[var(--text-dimmer)] transition hover:bg-[var(--row-hover)] hover:text-[var(--ui-accent)]"
                  aria-label={t("metaOAuthRedirectCopy")}
                  title={copied ? t("metaOAuthRedirectCopied") : t("metaOAuthRedirectCopy")}
                >
                  <Copy size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-semibold text-[var(--ui-accent)] [&::-webkit-details-marker]:hidden">
                {t("metaOAuthRedirectAll")}
                <ChevronDown
                  size={14}
                  className="transition group-open:rotate-180"
                  strokeWidth={2.5}
                />
              </summary>
              <ul className="mt-2 space-y-1.5">
                {data.redirectUris.map((uri) => (
                  <li key={uri}>
                    <code className="block break-all rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] px-2.5 py-1.5 text-[10px] text-[var(--text-dim)]">
                      {uri}
                    </code>
                  </li>
                ))}
              </ul>
            </details>
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ui-accent)] hover:underline"
            >
              developers.facebook.com/apps
              <ExternalLink size={12} strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
