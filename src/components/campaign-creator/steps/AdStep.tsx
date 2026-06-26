"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Image, Link2, Settings, UserCircle } from "lucide-react";

import { CreativePickerModal } from "@/components/campaign-creator/CreativePickerModal";
import { ImportAdConfigModal } from "@/components/campaign-creator/ImportAdConfigModal";
import { MessageTemplateEditor } from "@/components/campaign-creator/MessageTemplateEditor";
import { MetaDynamicParamInput } from "@/components/campaign-creator/MetaDynamicParamInput";
import { UtmBuilder } from "@/components/campaign-creator/UtmBuilder";
import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { FormField } from "@/components/ui/FormField";
import { FormSelect, type FormSelectOption } from "@/components/ui/FormSelect";
import { DsChoiceCard } from "@/design-system/components/DsChoiceCard";
import { WizardAccordionSection } from "@/uxpilot-ui/adapters/ux-wizard-primitives";
import { useClientPublishDefaults } from "@/hooks/useClientPublishDefaults";
import { usePublishAssets } from "@/hooks/usePublishAssets";
import { applyImportedToAd, cloneAdWithPreset, type ImportedAdConfig } from "@/lib/campaign-ad-import";
import { META_AD_COPY_LIMITS } from "@/lib/meta-ad-creative";
import { MetaTextVariantsInput } from "@/components/campaign-creator/MetaTextVariantsInput";
import { adsetsWithReuseCreativeCompatibility, getActiveAd, getActiveAdset, defaultAdItem, newDraftId } from "@/lib/campaign-draft";
import type { AdDraftItem } from "@/lib/campaign-draft";
import { defaultUtm } from "@/lib/campaign-utm";
import { usePlatformFeature } from "@/hooks/usePlatformFeature";

type AdView = "setup" | "identity" | "creative" | "destination";

export function AdStep() {
  const t = useTranslations("campaignCreator");
  const tAds = useTranslations("ads");
  const locale = useLocale();
  const { payload, updatePayload, addAdMode } = useCampaignDraft();
  const { assets, pages, instagramAccounts, pixels, whatsappNumbers, loadAssets, assetsError } = usePublishAssets(
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
  const [whatsappManualEntry, setWhatsappManualEntry] = useState(false);
  const [activeView, setActiveView] = useState<AdView>("setup");
  const topRef = useRef<HTMLDivElement>(null);
  const showMetaAppDevelopmentNotice = usePlatformFeature("campaigns.meta-app-development-notice");

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

  const pageWhatsappOptions = useMemo(
    () => whatsappNumbers.filter((w) => w.pageId === ad.pageId),
    [whatsappNumbers, ad.pageId]
  );

  const pageOptions = useMemo(
    (): FormSelectOption[] => pages.map((p) => ({ value: p.metaPageId, label: p.name })),
    [pages]
  );

  function patchAd(patch: Partial<AdDraftItem>) {
    updatePayload((p) => ({
      ...p,
      ads: p.ads.map((a) => (a.id === ad.id ? { ...a, ...patch } : a))
    }));
  }

  useEffect(() => {
    if (ad.destinationType !== "whatsapp") {
      setWhatsappManualEntry(false);
      return;
    }
    if (whatsappManualEntry) return;
    if (pageWhatsappOptions.length === 1 && !ad.linkUrl.trim()) {
      patchAd({ linkUrl: pageWhatsappOptions[0]!.waMeUrl, callToAction: "WHATSAPP_MESSAGE" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-fill only when page/options change
  }, [ad.destinationType, ad.pageId, pageWhatsappOptions, whatsappManualEntry]);

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

  function removeAd(adId: string) {
    if (payload.ads.length <= 1) return;
    updatePayload((p) => {
      const ads = p.ads.filter((a) => a.id !== adId);
      const activeAdId = p.activeAdId === adId ? ads[0]!.id : p.activeAdId;
      return { ...p, ads, activeAdId };
    });
  }

  function handleImport(imported: ImportedAdConfig, mode: "copy" | "media" | "all") {
    updatePayload((p) => {
      const nextAd = applyImportedToAd(ad, imported, mode);
      const ads = p.ads.map((a) => (a.id === ad.id ? nextAd : a));
      const draft = { ...p, ads };
      return { ...p, ads, adsets: adsetsWithReuseCreativeCompatibility(draft, nextAd) };
    });
    setCopyMode("manual");
  }

  function handleImportMany(importedList: ImportedAdConfig[], mode: "copy" | "media" | "all") {
    const activeAdset = getActiveAdset(payload);
    let lastId = "";
    updatePayload((p) => {
      const newAds = importedList.map((imported) => {
        const shell = defaultAdItem(locale);
        const applied = applyImportedToAd(shell, imported, mode);
        lastId = applied.id;
        const targets = applied.targetAdsetIds.includes("__all__")
          ? [activeAdset.id]
          : applied.targetAdsetIds;
        return { ...applied, targetAdsetIds: targets.length ? targets : [activeAdset.id] };
      });
      let ads = [...p.ads, ...newAds];
      let adsets = p.adsets;
      let draft = { ...p, ads, adsets, activeAdId: lastId };
      for (const newAd of newAds) {
        adsets = adsetsWithReuseCreativeCompatibility(draft, newAd);
        draft = { ...draft, adsets };
      }
      return { ...p, ads, adsets, activeAdId: lastId };
    });
    scrollToAdForm();
    setCopyMode("manual");
  }

  function setReuseMetaCreative(reuse: boolean) {
    updatePayload((p) => {
      const nextAd = { ...ad, reuseMetaCreative: reuse };
      const ads = p.ads.map((a) => (a.id === ad.id ? nextAd : a));
      const draft = { ...p, ads };
      return {
        ...p,
        ads,
        adsets: reuse ? adsetsWithReuseCreativeCompatibility(draft, nextAd) : p.adsets
      };
    });
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
      patchAd({
        titles: (j.titles ?? []).slice(0, META_AD_COPY_LIMITS.titles),
        bodies: (j.bodies ?? []).slice(0, META_AD_COPY_LIMITS.bodies)
      });
      setCopyMode("manual");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "aiFailed");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div ref={topRef} className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 bg-[var(--surface-bg)]">
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

      {payload.meta?.creationMode === "ai" && payload.meta?.wizardGenerated ? (
        <div className="ui-brain-shelf rounded-xl px-4 py-3 text-sm text-[var(--text-dim)]">
          {t("aiWizardPickCreative")}
        </div>
      ) : null}

        <div>
          <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{t("treeAd")}</h2>
          <p className="mt-1 hidden text-xs text-[var(--text-dim)] sm:block">{t("adStepHint")}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:hidden">
          <DsChoiceCard compact title={t("adSub_setup")} icon={<Settings size={16} />} accent={activeView === "setup"} onClick={() => setActiveView("setup")} />
          <DsChoiceCard compact title={t("identitySection")} icon={<UserCircle size={16} />} accent={activeView === "identity"} onClick={() => setActiveView("identity")} />
          <DsChoiceCard compact title={t("adSub_creative")} icon={<Image size={16} />} accent={activeView === "creative"} onClick={() => setActiveView("creative")} />
          <DsChoiceCard compact title={t("destinationSection")} icon={<Link2 size={16} />} accent={activeView === "destination"} onClick={() => setActiveView("destination")} />
        </div>

        <div className="hidden gap-4 lg:grid lg:grid-cols-4">
          <DsChoiceCard title={t("adSub_setup")} description={t("adSection_setup_hint")} icon={<Settings size={18} />} accent={activeView === "setup"} onClick={() => setActiveView("setup")} className="h-full" />
          <DsChoiceCard title={t("identitySection")} description={t("adSection_identity_hint")} icon={<UserCircle size={18} />} accent={activeView === "identity"} onClick={() => setActiveView("identity")} className="h-full" />
          <DsChoiceCard title={t("adSub_creative")} description={t("adSection_creative_hint")} icon={<Image size={18} />} accent={activeView === "creative"} onClick={() => setActiveView("creative")} className="h-full" />
          <DsChoiceCard title={t("destinationSection")} description={t("adSection_destination_hint")} icon={<Link2 size={18} />} accent={activeView === "destination"} onClick={() => setActiveView("destination")} className="h-full" />
        </div>
      </div>

      <div className="campaign-creator-main-scroll min-h-0 flex-1 overflow-y-auto pt-4 pb-2">
        <div className="campaign-creator-main-scroll__inner space-y-3">

      {activeView === "setup" ? (
        <>
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
          <span key={a.id} className="inline-flex items-center gap-0.5">
            <button
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
            {payload.ads.length > 1 ? (
              <button
                type="button"
                onClick={() => removeAd(a.id)}
                className="rounded-md px-1 py-0.5 text-xs text-[var(--text-dimmer)] hover:bg-red-50 hover:text-red-600"
                title={t("removeAd")}
                aria-label={t("removeAd")}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setImportOpen(true)}
        disabled={clientRequired || !payload.adAccountId}
        className="ui-btn-secondary text-xs"
      >
        {t("importAdConfig")}
      </button>

      {ad.metaCreativeId ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/5 p-4 space-y-2">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={ad.reuseMetaCreative}
              onChange={(e) => setReuseMetaCreative(e.target.checked)}
              className="mt-0.5"
              disabled={clientRequired}
            />
            <span className="text-sm text-[var(--text-main)]">
              <span className="font-medium">{t("reuseMetaCreativeLabel")}</span>
              <span className="mt-1 block text-xs text-[var(--text-dim)]">{t("reuseMetaCreativeHint")}</span>
              <span className="mt-1 block font-mono text-[10px] text-[var(--text-dimmer)]">
                {t("reuseMetaCreativeId", { id: ad.metaCreativeId })}
              </span>
            </span>
          </label>
        </div>
      ) : showMetaAppDevelopmentNotice ? (
        <p className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] px-4 py-3 text-xs text-[var(--text-dim)]">
          {t("devModeCreativeNote")}
        </p>
      ) : null}

      <FormField label={t("adName")}>
        <input
          value={ad.name}
          onChange={(e) => patchAd({ name: e.target.value })}
          placeholder={t("adNamePlaceholder")}
          className="ui-input border-[var(--border-hover)] shadow-sm"
          disabled={clientRequired}
        />
      </FormField>
        </>
      ) : null}

      {activeView === "identity" ? (
      <WizardAccordionSection title={t("identitySection")} defaultOpen>
      <div className="space-y-3">
        {inheritedLocked ? (
          <span className="inline-flex rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-[10px] font-medium text-[var(--violet)]">
            {t("inheritedFromAdset")}
          </span>
        ) : null}
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
                <p>{assetsError ? t("identityAssetsError") : t("identityPagesEmpty")}</p>
                <button
                  type="button"
                  onClick={() => void loadAssets(payload.adAccountId)}
                  className="mt-1 font-medium text-[var(--violet)] underline"
                >
                  {t("identityRecheck")}
                </button>
                {assetsError ? (
                  <p className="mt-1 text-[10px] opacity-80">
                    {t("identityAssetsErrorCode", { code: assetsError })}
                  </p>
                ) : null}
              </div>
            ) : null}
            <FormField label={tAds("page")}>
              <FormSelect
                value={ad.pageId}
                onChange={(pageId) => {
                  setWhatsappManualEntry(false);
                  patchAd({ pageId });
                }}
                placeholder={tAds("selectPage")}
                options={pageOptions}
                disabled={clientRequired}
              />
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
      </WizardAccordionSection>
      ) : null}

      {activeView === "creative" ? (
      <>
      <WizardAccordionSection title={t("copyTabManual")} defaultOpen>
      <div className="space-y-3">
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
        <MetaTextVariantsInput
          label={tAds("titleLabel")}
          values={ad.titles.length ? ad.titles : [""]}
          onChange={(titles) =>
            patchAd({ titles: titles.slice(0, META_AD_COPY_LIMITS.titles) })
          }
          maxItems={META_AD_COPY_LIMITS.titles}
          placeholder={tAds("titlePlaceholder")}
          disabled={clientRequired}
          addLabel={t("adCopyAddTitle")}
          removeLabel={t("adCopyRemoveVariant")}
          countLabel={(count, max) => t("adCopyVariantCount", { count, max })}
        />
        <MetaTextVariantsInput
          label={tAds("bodyLabel")}
          values={ad.bodies.length ? ad.bodies : [""]}
          onChange={(bodies) =>
            patchAd({ bodies: bodies.slice(0, META_AD_COPY_LIMITS.bodies) })
          }
          maxItems={META_AD_COPY_LIMITS.bodies}
          placeholder={tAds("bodyPlaceholder")}
          disabled={clientRequired}
          addLabel={t("adCopyAddBody")}
          removeLabel={t("adCopyRemoveVariant")}
          countLabel={(count, max) => t("adCopyVariantCount", { count, max })}
        />
      </div>
      </WizardAccordionSection>

      <WizardAccordionSection title={tAds("media")} defaultOpen>
      <div className="space-y-3">
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
      </WizardAccordionSection>
      </>
      ) : null}

      {activeView === "destination" ? (
      <>
      <WizardAccordionSection title={t("destinationSection")} defaultOpen>
      <div className="space-y-3">
        <FormField label={t("destinationType")}>
          <select
            value={ad.destinationType}
            onChange={(e) => {
              const destinationType = e.target.value as AdDraftItem["destinationType"];
              const patch: Partial<AdDraftItem> = { destinationType };
              if (
                destinationType === "whatsapp" &&
                (!ad.callToAction || ad.callToAction === "LEARN_MORE")
              ) {
                patch.callToAction = "WHATSAPP_MESSAGE";
              }
              patchAd(patch);
            }}
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
        ) : ad.destinationType === "whatsapp" ? (
          <div className="space-y-2">
            {pageWhatsappOptions.length > 0 && !whatsappManualEntry ? (
              <FormField label={t("destWhatsappSelect")}>
                <select
                  value={
                    pageWhatsappOptions.some((w) => w.waMeUrl === ad.linkUrl) ? ad.linkUrl : ""
                  }
                  onChange={(e) => {
                    const waMeUrl = e.target.value;
                    if (waMeUrl) {
                      patchAd({ linkUrl: waMeUrl, callToAction: "WHATSAPP_MESSAGE" });
                    }
                  }}
                  className="ui-select"
                  disabled={clientRequired}
                >
                  <option value="">{t("destWhatsappSelectPlaceholder")}</option>
                  {pageWhatsappOptions.map((w) => (
                    <option key={w.waMeUrl} value={w.waMeUrl}>
                      {w.phone}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : (
              <p className="text-xs text-amber-700">{t("destWhatsappEmpty")}</p>
            )}
            {pageWhatsappOptions.length > 0 ? (
              <button
                type="button"
                className="text-[11px] text-[var(--violet)] hover:underline"
                onClick={() => setWhatsappManualEntry((v) => !v)}
              >
                {t("destWhatsappManualFallback")}
              </button>
            ) : null}
            {(whatsappManualEntry || pageWhatsappOptions.length === 0) ? (
              <FormField label={t("destWhatsappUrl")}>
                <input
                  value={ad.linkUrl}
                  onChange={(e) => patchAd({ linkUrl: e.target.value })}
                  placeholder="https://wa.me/..."
                  className="ui-input"
                  disabled={clientRequired}
                />
              </FormField>
            ) : null}
          </div>
        ) : (
          <FormField label={tAds("destinationUrl")}>
            <input
              value={ad.linkUrl}
              onChange={(e) => patchAd({ linkUrl: e.target.value })}
              placeholder="https://"
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
            <option value="LEARN_MORE">{t("ctaLearnMore")}</option>
            <option value="SIGN_UP">{t("ctaSignUp")}</option>
            <option value="SHOP_NOW">{t("ctaShopNow")}</option>
            <option value="CONTACT_US">{t("ctaContactUs")}</option>
            <option value="WHATSAPP_MESSAGE">{t("ctaWhatsapp")}</option>
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
          <MetaDynamicParamInput
            value={ad.urlParams}
            onChange={(v) => patchAd({ urlParams: v })}
            placeholder={t("urlParamsOverrideHint")}
            disabled={clientRequired}
          />
        </FormField>
        <p className="text-[10px] text-[var(--text-dimmer)]">{t("dynamicParamHint")}</p>
        {!publishReady && payload.clientSlug ? (
          <p className="text-[11px] text-amber-700">{tAds("publishNotReady")}</p>
        ) : null}
      </div>
      </WizardAccordionSection>

      <WizardAccordionSection title={t("trackingSection")}>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={ad.tracking.websiteEvents}
            onChange={(e) =>
              patchAd({
                tracking: { ...ad.tracking, websiteEvents: e.target.checked }
              })
            }
            className="accent-[var(--ui-accent)]"
          />
          {t("trackWebsite")}
        </label>
      </WizardAccordionSection>

      <div className="rounded-xl border border-dashed border-[var(--ui-accent-border)] bg-[var(--surface-card)] p-4 space-y-3">
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
      </>
      ) : null}

        </div>
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
        onImportMany={handleImportMany}
      />
    </div>
  );
}
