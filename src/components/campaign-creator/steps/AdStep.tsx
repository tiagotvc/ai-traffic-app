"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { useClientPublishDefaults } from "@/hooks/useClientPublishDefaults";
import { usePublishAssets } from "@/hooks/usePublishAssets";

export function AdStep() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const locale = useLocale();
  const { payload, updatePayload } = useCampaignDraft();
  const { assets, pages, instagramAccounts, pixels } = usePublishAssets(
    payload.clientSlug,
    payload.adAccountId
  );
  const { publishReady, linkUrl: defaultLink, defaultPageId } = useClientPublishDefaults(
    payload.clientSlug,
    locale
  );
  const [leadForms, setLeadForms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!payload.ad.pageId && defaultPageId) {
      updatePayload((p) => ({ ...p, ad: { ...p.ad, pageId: defaultPageId } }));
    }
    if (!payload.ad.linkUrl && defaultLink) {
      updatePayload((p) => ({ ...p, ad: { ...p.ad, linkUrl: defaultLink } }));
    }
  }, [defaultPageId, defaultLink, payload.ad.pageId, payload.ad.linkUrl, updatePayload]);

  useEffect(() => {
    const pageId = payload.ad.pageId;
    if (!pageId || payload.objective !== "leads") {
      setLeadForms([]);
      return;
    }
    fetch(`/api/meta/lead-forms?pageId=${encodeURIComponent(pageId)}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; forms?: { id: string; name: string }[] }) => {
        setLeadForms(j.forms ?? []);
      })
      .catch(() => setLeadForms([]));
  }, [payload.ad.pageId, payload.objective]);

  const selectedHashes = new Set(payload.ad.imageHashes);

  return (
    <div className="space-y-4">
      <FormField label={t("adName")}>
        <input
          value={payload.ad.name}
          onChange={(e) =>
            updatePayload((p) => ({ ...p, ad: { ...p.ad, name: e.target.value } }))
          }
          className="ui-input"
        />
      </FormField>

      <div className="ui-card space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t("identitySection")}</h3>
        <FormField label={tAds("page")}>
          <select
            value={payload.ad.pageId}
            onChange={(e) =>
              updatePayload((p) => ({ ...p, ad: { ...p.ad, pageId: e.target.value } }))
            }
            className="ui-select"
          >
            <option value="">{tAds("selectPage")}</option>
            {pages.map((p) => (
              <option key={p.metaPageId} value={p.metaPageId}>
                {p.name}
              </option>
            ))}
          </select>
        </FormField>
        {instagramAccounts.length > 0 ? (
          <FormField label={tAds("instagram")}>
            <select
              value={payload.ad.instagramActorId ?? ""}
              onChange={(e) =>
                updatePayload((p) => ({
                  ...p,
                  ad: { ...p.ad, instagramActorId: e.target.value || null }
                }))
              }
              className="ui-select"
            >
              <option value="">{tAds("instagramNone")}</option>
              {instagramAccounts.map((i) => (
                <option key={i.id} value={i.id}>
                  @{i.username}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
        {pixels.length > 0 && payload.objective === "sales" ? (
          <FormField label={tAds("pixel")}>
            <select
              value={payload.ad.pixelId ?? ""}
              onChange={(e) =>
                updatePayload((p) => ({
                  ...p,
                  ad: { ...p.ad, pixelId: e.target.value || null }
                }))
              }
              className="ui-select"
            >
              <option value="">{tAds("pixelNone")}</option>
              {pixels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t("destinationSection")}</h3>
        {payload.objective === "leads" ? (
          <FormField label={t("destinationType")}>
            <select
              value={payload.ad.destinationType}
              onChange={(e) =>
                updatePayload((p) => ({
                  ...p,
                  ad: {
                    ...p.ad,
                    destinationType: e.target.value as "website" | "instant_form"
                  }
                }))
              }
              className="ui-select"
            >
              <option value="website">{t("destWebsite")}</option>
              <option value="instant_form">{t("destInstantForm")}</option>
            </select>
          </FormField>
        ) : null}
        {payload.ad.destinationType === "instant_form" && payload.objective === "leads" ? (
          <FormField label={t("leadForm")}>
            <select
              value={payload.ad.leadFormId ?? ""}
              onChange={(e) =>
                updatePayload((p) => ({
                  ...p,
                  ad: { ...p.ad, leadFormId: e.target.value || null }
                }))
              }
              className="ui-select"
            >
              <option value="">{t("selectLeadForm")}</option>
              {leadForms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </FormField>
        ) : (
          <FormField label={tAds("destinationUrl")}>
            <input
              value={payload.ad.linkUrl}
              onChange={(e) =>
                updatePayload((p) => ({ ...p, ad: { ...p.ad, linkUrl: e.target.value } }))
              }
              placeholder="https://"
              className="ui-input"
            />
          </FormField>
        )}
        {!publishReady && payload.clientSlug ? (
          <p className="text-[11px] text-amber-700">{tAds("publishNotReady")}</p>
        ) : null}
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{tAds("dynamicCreatives")}</h3>
        <FormField label={tAds("titles")}>
          <textarea
            value={payload.ad.titles.join("\n")}
            onChange={(e) =>
              updatePayload((p) => ({
                ...p,
                ad: { ...p.ad, titles: e.target.value.split("\n") }
              }))
            }
            className="ui-textarea"
            rows={4}
          />
        </FormField>
        <FormField label={tAds("descriptions")}>
          <textarea
            value={payload.ad.bodies.join("\n")}
            onChange={(e) =>
              updatePayload((p) => ({
                ...p,
                ad: { ...p.ad, bodies: e.target.value.split("\n") }
              }))
            }
            className="ui-textarea"
            rows={4}
          />
        </FormField>
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{tAds("media")}</h3>
        <p className="text-[11px] text-slate-500">{tAds("mediaHint")}</p>
        <div className="grid gap-2">
          {assets.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedHashes.has(a.id)}
                onChange={(e) => {
                  updatePayload((p) => ({
                    ...p,
                    ad: {
                      ...p.ad,
                      imageHashes: e.target.checked
                        ? [...p.ad.imageHashes, a.id]
                        : p.ad.imageHashes.filter((h) => h !== a.id)
                    }
                  }));
                }}
                className="accent-violet-600"
              />
              <span className="text-xs text-slate-700">{a.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {tAds("selected", { count: payload.ad.imageHashes.length })}
        </p>
      </div>

      <div className="ui-card space-y-2 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{t("trackingSection")}</h3>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={payload.ad.tracking.websiteEvents}
            onChange={(e) =>
              updatePayload((p) => ({
                ...p,
                ad: {
                  ...p.ad,
                  tracking: { ...p.ad.tracking, websiteEvents: e.target.checked }
                }
              }))
            }
            className="accent-violet-600"
          />
          {t("trackWebsite")}
        </label>
      </div>
    </div>
  );
}
