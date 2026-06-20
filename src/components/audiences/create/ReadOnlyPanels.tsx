"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/Badge";
import type { AudienceCreateContext } from "./types";

type Props = {
  ctx: AudienceCreateContext;
  onBack: () => void;
};

export function CustomerListPanel({ ctx, onBack }: Props) {
  const t = useTranslations("audiences");

  const lists = ctx.audiences.filter((a) => {
    const s = (a.subtype ?? "").toUpperCase();
    return s === "CUSTOM" || s.includes("LIST");
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("createType.customer_list.title")}</h2>
        <button type="button" onClick={onBack} className="ui-btn-secondary text-sm">
          {t("back")}
        </button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">{t("listUploadTitle")}</p>
        <p className="mt-1 text-xs">{t("listUploadBody")}</p>
        <a
          href="https://business.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-[var(--violet)] underline"
        >
          {t("openMetaAdsManager")}
        </a>
      </div>

      <div>
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("existingLists")}</h3>
        <div className="mt-2 space-y-2">
          {lists.length === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">{t("noLists")}</p>
          ) : (
            lists.map((a) => (
              <div key={a.id} className="rounded-xl border border-[var(--border-color)] p-3">
                <div className="font-medium text-[var(--text-main)]">{a.name}</div>
                <div className="mt-1 flex gap-2">
                  <Badge variant="success">{a.subtype}</Badge>
                  {a.approximateCount != null ? (
                    <span className="text-xs text-[var(--text-dim)]">~{a.approximateCount.toLocaleString()}</span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function AppAudiencePanel({ ctx, onBack }: Props) {
  const t = useTranslations("audiences");

  const appAudiences = ctx.audiences.filter((a) =>
    (a.subtype ?? "").toUpperCase().includes("APP")
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">{t("createType.app.title")}</h2>
        <button type="button" onClick={onBack} className="ui-btn-secondary text-sm">
          {t("back")}
        </button>
      </div>

      {appAudiences.length === 0 ? (
        <div className="ui-alert-warning px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">{t("appCreateTitle")}</p>
          <p className="mt-1 text-xs">{t("appCreateBody")}</p>
          <a
            href="https://business.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-[var(--violet)] underline"
          >
            {t("openMetaAdsManager")}
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {appAudiences.map((a) => (
            <div key={a.id} className="rounded-xl border border-[var(--border-color)] p-3">
              <div className="font-medium text-[var(--text-main)]">{a.name}</div>
              <div className="mt-1">
                <Badge variant="neutral">{a.subtype}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
