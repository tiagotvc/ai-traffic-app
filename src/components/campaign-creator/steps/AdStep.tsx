"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { CreativePickerModal } from "@/components/campaign-creator/CreativePickerModal";
import { ImportAdConfigModal } from "@/components/campaign-creator/ImportAdConfigModal";
import { MessageTemplateEditor } from "@/components/campaign-creator/MessageTemplateEditor";
import { UtmBuilder } from "@/components/campaign-creator/UtmBuilder";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { useClientPublishDefaults } from "@/hooks/useClientPublishDefaults";
import { usePublishAssets } from "@/hooks/usePublishAssets";
import { applyImportedToAd, cloneAdWithPreset, type ImportedAdConfig } from "@/lib/campaign-ad-import";
import { getActiveAd, getActiveAdset, defaultAdItem, newDraftId } from "@/lib/campaign-draft";
import type { AdDraftItem } from "@/lib/campaign-draft";
import { defaultUtm } from "@/lib/campaign-utm";

export function AdStep() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const locale = useLocale();
  const { payload, updatePayload, addAdMode } = useCampaignDraft();
  const { assets, pages, instagramAccounts, pixels, loadAssets } = usePublishAssets(
    payload.clientSlug,
    payload.adAccountId
  );
  const { publishReady, linkUrl: defaultLink, defaultPageId } = useClientPublishDefaults(
    payload.clientSlug,
    locale
  );
  const [leadForms, setLeadForms] = useState<{ id: string; name: string }[]>([]);
  const [creativeOpen, setCreativeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copyMode, setCopyMode] = useState<"manual" | "ai">("manual");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [identityUnlocked, setIdentityUnlocked] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const ad = getActiveAd(payload);
  const adset = getActiveAdset(payload);
  const inheritedLocked = !!payload.meta?.inheritedContextLocked && !identityUnlocked;
  const showMessagingTemplate =
    adset.conversionLocation === "messaging" ||
    ad.destinationType === "whatsapp" ||
    ad.callToAction === "WHATSAPP_MESSAGE";
  const clientRequired = !payload.clientSlug;

  const mediaPreviews = useMemo(() => {
    const ids = ad.format === "video" ? ad.videoIds : ad.imageHashes;
    return ids.map((id) => {
      const asset = assets.find((a) => a.id === id);
      return {
        id,
        label: asset?.label ?? id.slice(0, 8),
        url: asset?.url,
        kind: ad.format === "video" ? ("video" as const) : ("image" as const)
      };
    });
  }, [ad.format, ad.imageHashes, ad.videoIds, assets]);

  function patchAd(patch: Partial<AdDraftItem>) {
    updatePayload((p) => ({
      ...p,
      ads: p.ads.map((a) => (a.id === ad.id ? { ...a, ...patch } : a))
    }));
  }

  function selectAd(id: string) {
    updatePayload({ activeAdId: id });
  }

  function scrollToAdForm() {
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function addAd(preset: "same_text" | "same_image") {
    const newId = newDraftId();
    updatePayload((p) => {
      const base = getActiveAd(p);
      const clone = cloneAdWithPreset(base, preset, locale, () => ({
        ...defaultAdItem(locale),
        id: newId
      }));
      return { ...p, ads: [...p.ads, clone], activeAdId: newId };
    });
    scrollToAdForm();
  }

  function addBlankAd() {
    const newId = newDraftId();
    updatePayload((p) => {
      const base = getActiveAd(p);
      const blank: AdDraftItem = {
        ...defaultAdItem(locale),
        id: newId,
        name: `${base.name} 2`,
        pageId: base.pageId,
        instagramActorId: base.instagramActorId,
        pixelId: base.pixelId,
        linkUrl: base.linkUrl,
        destinationType: base.destinationType,
        leadFormId: base.leadFormId,
        urlParams: base.urlParams,
        callToAction: base.callToAction,
        whatsappWelcomeMessage: base.whatsappWelcomeMessage,
        tracking: { ...base.tracking },
        targetAdsetIds: [...base.targetAdsetIds]
      };
      return { ...p, ads: [...p.ads, blank], activeAdId: newId };
    });
    scrollToAdForm();
  }

  function handleImport(imported: ImportedAdConfig, mode: "copy" | "media" | "all") {
    patchAd(applyImportedToAd(ad, imported, mode));
    setCopyMode("manual");
  }

  useEffect(() => {
    if (!ad.pageId && defaultPageId && !inheritedLocked) patchAd({ pageId: defaultPageId });
    if (!ad.linkUrl && defaultLink) patchAd({ linkUrl: defaultLink });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPageId, defaultLink, ad.id, inheritedLocked]);

  useEffect(() => {
    if (!payload.clientSlug) return;
    fetch(`/api/clients/${encodeURIComponent(payload.clientSlug)}/meta-settings`)
      .then((r) => r.json())
      .then((j: { settings?: { defaultUtm?: AdDraftItem["utm"] } }) => {
        const du = j.settings?.defaultUtm;
        if (!du || typeof du !== "object") return;
        const empty = !ad.utm.source && !ad.utm.medium && !ad.utm.campaign;
        if (empty) {
          patchAd({
            utm: {
              source: du.source ?? defaultUtm().source,
              medium: du.medium ?? defaultUtm().medium,
              campaign: du.campaign ?? "",
              content: du.content ?? "",
              term: du.term ?? ""
            }
          });
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.clientSlug, ad.id]);

  useEffect(() => {
    if (!ad.instagramActorId) return;
    if (
      instagramAccounts.length === 0 ||
      !instagramAccounts.some((i) => i.id === ad.instagramActorId)
    ) {
      patchAd({ instagramActorId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instagramAccounts, ad.instagramActorId, ad.id]);

  useEffect(() => {
    const pageId = ad.pageId;
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
  }, [ad.pageId, payload.objective]);

  async function generateCopy() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/campaign-creator/generate-copy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          objective: payload.objective,
          locale,
          countTitles: 3,
          countBodies: 2,
          clientId: payload.clientSlug || undefined
        })
      });
      const j = (await res.json()) as {
        ok?: boolean;
        titles?: string[];
        bodies?: string[];
        error?: string;
      };
      if (!j.ok) throw new Error(j.error ?? "aiFailed");
      patchAd({ titles: j.titles ?? [], bodies: j.bodies ?? [] });
      setCopyMode("manual");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "aiFailed");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div ref={topRef} className="space-y-4">
      {clientRequired ? (
        <p className="ui-alert-warning px-3 py-2 text-xs text-amber-800">
          {t("selectClientFirst")}
        </p>
      ) : null}

      {addAdMode && payload.meta?.targetAdsetName ? (
        <p className="rounded-xl border border-[rgba(124,58,237,0.15)] bg-[rgba(124,58,237,0.06)] px-3 py-2 text-xs text-[var(--violet)]">
          {t("addAdContext", { adset: payload.meta.targetAdsetName })}
        </p>
      ) : null}

      {!addAdMode ? (
        <div className="ui-card space-y-3 p-4">
          <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("adAssignmentTitle")}</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={payload.adAssignment === "all_adsets"}
                onChange={() =>
                  updatePayload((p) => ({
                    ...p,
                    adAssignment: "all_adsets",
                    ads: p.ads.map((a) => ({ ...a, targetAdsetIds: ["__all__"] }))
                  }))
                }
                className="accent-violet-600"
              />
              {t("adAssignmentAll")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={payload.adAssignment === "single"}
                onChange={() => updatePayload({ adAssignment: "single" })}
                className="accent-violet-600"
              />
              {t("adAssignmentSingle")}
            </label>
          </div>
          {payload.adAssignment === "single" ? (
            <select
              value={payload.selectedAdsetIdForAds ?? payload.adsets[0]?.id ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                updatePayload((p) => ({
                  ...p,
                  selectedAdsetIdForAds: id,
                  ads: p.ads.map((a) =>
                    a.id === ad.id ? { ...a, targetAdsetIds: [id] } : a
                  )
                }));
              }}
              className="ui-select text-sm"
            >
              {payload.adsets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {payload.ads.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => selectAd(a.id)}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              ad.id === a.id
                ? "bg-[rgba(124,58,237,0.1)] font-medium text-[var(--violet)]"
                : "bg-[var(--surface-bg)] text-[var(--text-dim)]"
            }`}
          >
            {a.name || t("treeAd")}
          </button>
        ))}
        <button
          type="button"
          onClick={() => addBlankAd()}
          className="rounded-lg border border-dashed border-violet-300 px-3 py-1.5 text-xs text-[var(--violet)]"
        >
          {t("addAd")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          disabled={clientRequired || !payload.adAccountId}
          className="ui-btn-secondary text-xs"
        >
          {t("importAdConfig")}
        </button>
      </div>

      <FormField label={t("adName")}>
        <input
          value={ad.name}
          onChange={(e) => patchAd({ name: e.target.value })}
          className="ui-input"
          disabled={clientRequired}
        />
      </FormField>

      <div className="ui-card space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("identitySection")}</h3>
          {inheritedLocked ? (
            <span className="rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-[10px] font-medium text-[var(--violet)]">
              {t("inheritedFromAdset")}
            </span>
          ) : null}
        </div>
        {inheritedLocked ? (
          <div className="space-y-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] p-3 text-xs text-[var(--text-dim)]">
            <p>
              <span className="font-medium text-[var(--text-dim)]">{tAds("page")}:</span>{" "}
              {(pages.find((p) => p.metaPageId === ad.pageId)?.name ?? ad.pageId) || "—"}
            </p>
            {ad.instagramActorId ? (
              <p>
                <span className="font-medium text-[var(--text-dim)]">{tAds("instagram")}:</span> @
                {instagramAccounts.find((i) => i.id === ad.instagramActorId)?.username ??
                  ad.instagramActorId}
              </p>
            ) : null}
            {adset.pixelId ? (
              <p>
                <span className="font-medium text-[var(--text-dim)]">{tAds("pixel")}:</span>{" "}
                {pixels.find((p) => p.id === adset.pixelId)?.name ?? adset.pixelId}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setIdentityUnlocked(true)}
              className="text-[11px] text-[var(--violet)] hover:underline"
            >
              {t("unlockInheritedIdentity")}
            </button>
          </div>
        ) : (
          <>
            {!pages.length && payload.adAccountId ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p>{t("identityPagesEmpty")}</p>
                <button
                  type="button"
                  onClick={() => void loadAssets(payload.adAccountId)}
                  className="mt-1 font-medium text-[var(--violet)] underline"
                >
                  {t("identityRecheck")}
                </button>
              </div>
            ) : null}
            <FormField label={tAds("page")}>
              <select
                value={ad.pageId}
                onChange={(e) => patchAd({ pageId: e.target.value })}
                className="ui-select"
                disabled={clientRequired}
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
                  value={ad.instagramActorId ?? ""}
                  onChange={(e) => patchAd({ instagramActorId: e.target.value || null })}
                  className="ui-select"
                  disabled={clientRequired}
                >
                  <option value="">{tAds("instagramNone")}</option>
                  {instagramAccounts.map((i) => (
                    <option key={i.id} value={i.id}>
                      @{i.username}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : pages.length > 0 && payload.adAccountId ? (
              <p className="text-xs text-amber-700">{t("identityInstagramEmpty")}</p>
            ) : null}
            {pixels.length > 0 && payload.objective === "sales" ? (
              <FormField label={tAds("pixel")}>
                <select
                  value={ad.pixelId ?? ""}
                  onChange={(e) => patchAd({ pixelId: e.target.value || null })}
                  className="ui-select"
                  disabled={clientRequired}
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
          </>
        )}
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("destinationSection")}</h3>
        <FormField label={t("destinationType")}>
          <select
            value={ad.destinationType}
            onChange={(e) =>
              patchAd({
                destinationType: e.target.value as AdDraftItem["destinationType"]
              })
            }
            className="ui-select"
            disabled={clientRequired}
          >
            <option value="website">{t("destWebsite")}</option>
            {payload.objective === "leads" ? (
              <option value="instant_form">{t("destInstantForm")}</option>
            ) : null}
            <option value="whatsapp">{t("destWhatsapp")}</option>
          </select>
        </FormField>
        {ad.destinationType === "instant_form" && payload.objective === "leads" ? (
          <FormField label={t("leadForm")}>
            <select
              value={ad.leadFormId ?? ""}
              onChange={(e) => patchAd({ leadFormId: e.target.value || null })}
              className="ui-select"
              disabled={clientRequired}
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
          <FormField
            label={
              ad.destinationType === "whatsapp" ? t("destWhatsappUrl") : tAds("destinationUrl")
            }
          >
            <input
              value={ad.linkUrl}
              onChange={(e) => patchAd({ linkUrl: e.target.value })}
              placeholder={ad.destinationType === "whatsapp" ? "https://wa.me/..." : "https://"}
              className="ui-input"
              disabled={clientRequired}
            />
          </FormField>
        )}
        <FormField label={t("callToAction")}>
          <select
            value={ad.callToAction || "LEARN_MORE"}
            onChange={(e) => patchAd({ callToAction: e.target.value })}
            className="ui-select"
            disabled={clientRequired}
          >
            <option value="LEARN_MORE">LEARN_MORE</option>
            <option value="SIGN_UP">SIGN_UP</option>
            <option value="SHOP_NOW">SHOP_NOW</option>
            <option value="CONTACT_US">CONTACT_US</option>
            <option value="WHATSAPP_MESSAGE">WHATSAPP_MESSAGE</option>
          </select>
        </FormField>
        {showMessagingTemplate ? (
          <MessageTemplateEditor
            clientSlug={payload.clientSlug}
            value={ad.messageTemplate}
            defaultChannel={
              adset.messagingChannels.includes("whatsapp")
                ? "whatsapp"
                : adset.messagingChannels.includes("messenger")
                  ? "messenger"
                  : adset.messagingChannels.includes("instagram")
                    ? "instagram"
                    : "whatsapp"
            }
            onChange={(messageTemplate) => {
              patchAd({
                messageTemplate,
                whatsappWelcomeMessage: messageTemplate?.greeting?.trim() || null
              });
            }}
            disabled={clientRequired}
          />
        ) : null}
        <UtmBuilder
          value={ad.utm}
          onChange={(utm) => patchAd({ utm })}
          disabled={clientRequired}
        />
        <FormField label={t("urlParams")}>
          <input
            value={ad.urlParams}
            onChange={(e) => patchAd({ urlParams: e.target.value })}
            placeholder={t("urlParamsOverrideHint")}
            className="ui-input font-mono text-xs"
            disabled={clientRequired}
          />
        </FormField>
        {!publishReady && payload.clientSlug ? (
          <p className="text-[11px] text-amber-700">{tAds("publishNotReady")}</p>
        ) : null}
      </div>

      <div className="ui-card space-y-3 p-4">
        <div className="flex gap-2 border-b border-[var(--border-color)] pb-2">
          <button
            type="button"
            onClick={() => setCopyMode("manual")}
            className={`text-xs font-medium ${copyMode === "manual" ? "text-[var(--violet)]" : "text-[var(--text-dim)]"}`}
          >
            {t("copyTabManual")}
          </button>
          <button
            type="button"
            onClick={() => setCopyMode("ai")}
            className={`text-xs font-medium ${copyMode === "ai" ? "text-[var(--violet)]" : "text-[var(--text-dim)]"}`}
          >
            {t("copyTabAi")}
          </button>
        </div>
        {copyMode === "ai" ? (
          <div className="space-y-2">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t("copyAiPlaceholder")}
              className="ui-textarea text-sm"
              rows={3}
            />
            <button
              type="button"
              onClick={() => void generateCopy()}
              disabled={aiLoading || !aiPrompt.trim()}
              className="ui-btn-primary text-sm"
            >
              {aiLoading ? t("generatingAi") : t("copyAiGenerate")}
            </button>
            {aiError ? <p className="text-xs text-red-600">{aiError}</p> : null}
          </div>
        ) : null}
        <FormField label={tAds("titles")}>
          <textarea
            value={ad.titles.join("\n")}
            onChange={(e) => patchAd({ titles: e.target.value.split("\n") })}
            className="ui-textarea"
            rows={4}
            disabled={clientRequired}
          />
        </FormField>
        <FormField label={tAds("descriptions")}>
          <textarea
            value={ad.bodies.join("\n")}
            onChange={(e) => patchAd({ bodies: e.target.value.split("\n") })}
            className="ui-textarea"
            rows={4}
            disabled={clientRequired}
          />
        </FormField>
      </div>

      <div className="ui-card space-y-3 p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{tAds("media")}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => patchAd({ format: "single_image", videoIds: [] })}
            disabled={clientRequired}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              ad.format === "single_image"
                ? "border-violet-500 bg-[rgba(124,58,237,0.06)] text-[var(--violet)]"
                : "border-[var(--border-color)] text-[var(--text-dim)] hover:border-[var(--border-color)]"
            }`}
          >
            {t("formatImage")}
          </button>
          <button
            type="button"
            onClick={() => patchAd({ format: "video", imageHashes: [] })}
            disabled={clientRequired}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              ad.format === "video"
                ? "border-violet-500 bg-[rgba(124,58,237,0.06)] text-[var(--violet)]"
                : "border-[var(--border-color)] text-[var(--text-dim)] hover:border-[var(--border-color)]"
            }`}
          >
            {t("formatVideo")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCreativeOpen(true)}
          disabled={clientRequired || !payload.adAccountId}
          className="ui-btn-primary text-sm"
        >
          {t("creativeOpenModal")}
        </button>
        <p className="text-xs text-[var(--text-dim)]">
          {ad.format === "video"
            ? t("creativeSelectedVideos", {
                count: ad.videoIds.length
              })
            : tAds("selected", { count: ad.imageHashes.length })}
        </p>
        {mediaPreviews.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {mediaPreviews.map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)]"
              >
                {m.kind === "video" && m.url?.startsWith("blob:") ? (
                  <video src={m.url} className="h-16 w-16 object-cover" muted playsInline />
                ) : m.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.label} className="h-16 w-16 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 flex-col items-center justify-center px-1 text-center text-[9px] text-[var(--text-dim)]">
                    {m.kind === "video" ? <span className="text-sm">▶</span> : null}
                    {m.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <CreativePickerModal
        open={creativeOpen}
        onClose={() => setCreativeOpen(false)}
        assets={assets}
        mediaKind={ad.format === "video" ? "video" : "image"}
        selectedIds={ad.format === "video" ? ad.videoIds : ad.imageHashes}
        onChange={(ids) =>
          patchAd(ad.format === "video" ? { videoIds: ids } : { imageHashes: ids })
        }
        clientSlug={payload.clientSlug}
        adAccountId={payload.adAccountId}
      />

      <ImportAdConfigModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        clientSlug={payload.clientSlug}
        adAccountId={payload.adAccountId}
        defaultCampaignId={payload.meta?.targetMetaCampaignId}
        defaultAdsetId={payload.meta?.targetMetaAdsetId}
        onImport={handleImport}
      />

      <div className="ui-card space-y-2 p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("trackingSection")}</h3>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={ad.tracking.websiteEvents}
            onChange={(e) =>
              patchAd({
                tracking: { ...ad.tracking, websiteEvents: e.target.checked }
              })
            }
            className="accent-violet-600"
          />
          {t("trackWebsite")}
        </label>
      </div>

      <div className="ui-card space-y-3 border-dashed border-[rgba(124,58,237,0.2)] p-4">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("addAnotherAdTitle")}</h3>
        <p className="text-xs text-[var(--text-dim)]">{t("addAnotherAdHint")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => addAd("same_text")}
            className="ui-btn-secondary flex-1 text-xs"
          >
            {t("presetSameText")}
          </button>
          <button
            type="button"
            onClick={() => addAd("same_image")}
            className="ui-btn-secondary flex-1 text-xs"
          >
            {t("presetSameImage")}
          </button>
        </div>
      </div>
    </div>
  );
}
