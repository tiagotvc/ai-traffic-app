"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  type CampaignDraftPayload,
  type AdDraftItem,
  type CreatorNode,
  defaultAdItem,
  defaultAdSetItem,
  defaultCampaignDraft,
  isAddAdDraft,
  isInheritedCampaignDraft,
  newDraftId,
  parseCampaignDraftPayload,
  patchWizardNavigation
} from "@/lib/campaign-draft";
import { draftFallbackName, relocalizeDraftDefaultNames } from "@/lib/campaign-draft-i18n";
import { inferWizardActiveNode } from "@/lib/creator-wizard-nav";

type ClientOption = { id: string; slug: string; name: string };

export type MobileValidationToast = {
  variant: "error" | "warning" | "success";
  message: string;
  nonce: number;
};

type CampaignDraftContextValue = {
  draftId: string | null;
  draftName: string;
  payload: CampaignDraftPayload;
  activeNode: CreatorNode;
  setActiveNode: (n: CreatorNode) => void;
  updatePayload: (patch: Partial<CampaignDraftPayload> | ((p: CampaignDraftPayload) => CampaignDraftPayload)) => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: Date | null;
  clients: ClientOption[];
  clientsLoading: boolean;
  objectiveChosen: boolean;
  setObjectiveChosen: (v: boolean) => void;
  flushSave: () => Promise<void>;
  addAdMode: boolean;
  addAdsetMode: boolean;
  inheritCampaignMode: boolean;
  addAdLoading: boolean;
  mobileValidationToast: MobileValidationToast | null;
  showMobileValidationToast: (variant: MobileValidationToast["variant"], message: string) => void;
  clearMobileValidationToast: () => void;
};

const CampaignDraftContext = createContext<CampaignDraftContextValue | null>(null);

export function CampaignDraftProvider({
  children,
  initialDraftId,
  initialClientSlug,
  initialAddAd,
  initialAddAdset,
  initialActiveNode
}: {
  children: ReactNode;
  initialDraftId?: string;
  initialClientSlug?: string;
  initialAddAd?: {
    fromCampaignId: string;
    adsetId: string;
    clientSlug?: string;
  };
  initialAddAdset?: {
    fromCampaignId: string;
    clientSlug?: string;
  };
  initialActiveNode?: CreatorNode;
}) {
  const locale = useLocale();
  const t = useTranslations("campaignCreator");
  const prevLocaleRef = useRef(locale);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [draftName, setDraftName] = useState("");
  const [payload, setPayload] = useState<CampaignDraftPayload>(() => {
    const d = defaultCampaignDraft(locale);
    if (initialClientSlug) d.clientSlug = initialClientSlug;
    return d;
  });
  const [activeNode, setActiveNode] = useState<CreatorNode>(
    initialActiveNode ?? (initialAddAd ? "ad" : initialAddAdset ? "adset" : "campaign")
  );
  const [objectiveChosen, setObjectiveChosen] = useState(
    !!initialDraftId || !!initialAddAd || !!initialAddAdset
  );
  const [addAdLoading, setAddAdLoading] = useState(!!initialAddAd || !!initialAddAdset);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [mobileValidationToast, setMobileValidationToast] = useState<MobileValidationToast | null>(null);
  const mobileToastNonce = useRef(0);
  const payloadRef = useRef(payload);
  const draftIdRef = useRef(draftId);
  const draftNameRef = useRef(draftName);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  payloadRef.current = payload;
  draftIdRef.current = draftId;
  draftNameRef.current = draftName;

  useEffect(() => {
    if (prevLocaleRef.current === locale) return;
    prevLocaleRef.current = locale;
    setPayload((prev) =>
      relocalizeDraftDefaultNames(prev, (key) => t(key as Parameters<typeof t>[0]))
    );
  }, [locale, t]);

  useEffect(() => {
    setClientsLoading(true);
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j: { clients?: ClientOption[] }) => setClients(j.clients ?? []))
      .catch(() => {})
      .finally(() => setClientsLoading(false));
  }, []);

  useEffect(() => {
    if (!initialDraftId) return;
    fetch(`/api/campaign-templates/${encodeURIComponent(initialDraftId)}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; template?: { id: string; name: string; payload: unknown } }) => {
        if (!j.ok || !j.template) return;
        setDraftId(j.template.id);
        setDraftName(j.template.name);
        const parsed = parseCampaignDraftPayload(j.template.payload);
        setPayload(parsed);
        setObjectiveChosen(true);
        if (parsed.meta?.creationMode === "ai" || initialActiveNode === "review") {
          if (initialActiveNode === "ad" || parsed.meta?.wizardGenerated) {
            setActiveNode("ad");
          } else if (initialActiveNode === "review") {
            setActiveNode("review");
          } else if (parsed.meta?.creationMode === "ai") {
            setActiveNode("review");
          }
        } else if (initialActiveNode) {
          setActiveNode(initialActiveNode);
        } else {
          const savedNode = parsed.meta?.wizardNavigation?.activeNode;
          setActiveNode(savedNode ?? inferWizardActiveNode(parsed.visitedNodes));
        }
      })
      .catch(() => {});
  }, [initialDraftId, initialActiveNode]);

  const addAdFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialAddAd) return;
    const key = `${initialAddAd.fromCampaignId}:${initialAddAd.adsetId}:${initialAddAd.clientSlug ?? ""}`;
    if (addAdFetchedRef.current === key) return;
    addAdFetchedRef.current = key;
    const { fromCampaignId, adsetId, clientSlug } = initialAddAd;
    setAddAdLoading(true);
    fetch(
      `/api/campaigns/${encodeURIComponent(fromCampaignId)}/creator-snapshot?adset=${encodeURIComponent(adsetId)}&mode=add-ad`
    )
      .then((r) => r.json())
      .then(
        (j: {
          ok?: boolean;
          patch?: Partial<CampaignDraftPayload>;
          adAccountId?: string | null;
          clientSlug?: string;
          adsetName?: string;
          inheritedAd?: Partial<AdDraftItem>;
          inheritedAdset?: Partial<import("@/lib/campaign-draft").AdSetDraftItem>;
          error?: string;
        }) => {
          if (!j.ok || !j.patch) return;
          const adId = newDraftId();
          const adsetDraftId = newDraftId();
          const base = defaultCampaignDraft(locale);
          const inherited = j.inheritedAd ?? {};
          const inheritedAdset = j.inheritedAdset ?? {};
          const freshAd = {
            ...defaultAdItem(locale),
            ...inherited,
            id: adId,
            name: defaultAdItem(locale).name,
            titles: [],
            bodies: [],
            imageHashes: [],
            videoIds: [],
            targetAdsetIds: [adsetDraftId]
          };

          const next = parseCampaignDraftPayload({
            ...base,
            ...j.patch,
            clientSlug: clientSlug ?? j.clientSlug ?? base.clientSlug,
            adAccountId: j.adAccountId ?? "",
            adsets: [
              {
                ...base.adsets[0]!,
                ...inheritedAdset,
                id: adsetDraftId,
                name: j.adsetName ?? inheritedAdset.name ?? base.adsets[0]!.name
              }
            ],
            ads: [freshAd],
            activeAdsetId: adsetDraftId,
            activeAdId: adId,
            adAssignment: "single",
            selectedAdsetIdForAds: adsetDraftId,
            visitedNodes: ["ad", "review"],
            meta: {
              publishMode: "add_ad",
              targetMetaAdsetId: adsetId,
              targetMetaCampaignId: fromCampaignId,
              targetAdsetName: j.adsetName,
              inheritedContextLocked: true
            }
          });
          setPayload(next);
          setActiveNode("ad");
          setObjectiveChosen(true);
        }
      )
      .catch(() => {})
      .finally(() => setAddAdLoading(false));
  }, [
    initialAddAd?.fromCampaignId,
    initialAddAd?.adsetId,
    initialAddAd?.clientSlug,
    locale
  ]);

  const addAdsetFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialAddAdset) return;
    const key = `${initialAddAdset.fromCampaignId}:${initialAddAdset.clientSlug ?? ""}`;
    if (addAdsetFetchedRef.current === key) return;
    addAdsetFetchedRef.current = key;
    const { fromCampaignId, clientSlug } = initialAddAdset;
    setAddAdLoading(true);
    fetch(
      `/api/campaigns/${encodeURIComponent(fromCampaignId)}/creator-snapshot?mode=add-adset`
    )
      .then((r) => r.json())
      .then(
        (j: {
          ok?: boolean;
          patch?: Partial<CampaignDraftPayload>;
          adAccountId?: string | null;
          clientSlug?: string;
          campaignName?: string;
          inheritedAd?: Partial<AdDraftItem>;
          inheritedAdset?: Partial<import("@/lib/campaign-draft").AdSetDraftItem>;
        }) => {
          if (!j.ok || !j.patch) return;
          const adId = newDraftId();
          const adsetDraftId = newDraftId();
          const base = defaultCampaignDraft(locale);
          const freshAdset = {
            ...defaultAdSetItem(locale),
            ...(j.inheritedAdset ?? {}),
            id: adsetDraftId,
            name: defaultAdSetItem(locale).name
          };
          const freshAd = {
            ...defaultAdItem(locale),
            ...(j.inheritedAd ?? {}),
            id: adId,
            name: defaultAdItem(locale).name,
            titles: [],
            bodies: [],
            imageHashes: [],
            videoIds: [],
            targetAdsetIds: [adsetDraftId]
          };

          const next = parseCampaignDraftPayload({
            ...base,
            ...j.patch,
            clientSlug: clientSlug ?? j.clientSlug ?? base.clientSlug,
            adAccountId: j.adAccountId ?? "",
            adsets: [freshAdset],
            ads: [freshAd],
            activeAdsetId: adsetDraftId,
            activeAdId: adId,
            adAssignment: "single",
            selectedAdsetIdForAds: adsetDraftId,
            visitedNodes: ["adset", "ad", "review"],
            meta: {
              publishMode: "add_adset",
              targetMetaCampaignId: fromCampaignId,
              inheritedContextLocked: true
            }
          });
          setPayload(next);
          setActiveNode("adset");
          setObjectiveChosen(true);
        }
      )
      .catch(() => {})
      .finally(() => setAddAdLoading(false));
  }, [initialAddAdset?.fromCampaignId, initialAddAdset?.clientSlug, locale]);

  const persist = useCallback(async () => {
    if (isInheritedCampaignDraft(payloadRef.current)) return;
    const p = payloadRef.current;
    const name = draftNameRef.current || p.campaign.name || draftFallbackName(locale);
    const clientId = clients.find((c) => c.slug === p.clientSlug || c.id === p.clientSlug)?.id ?? null;
    setSaving(true);
    setSaveError(null);
    try {
      if (draftIdRef.current) {
        const res = await fetch(`/api/campaign-templates/${encodeURIComponent(draftIdRef.current)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, payload: p, clientId })
        });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error ?? "saveFailed");
      } else {
        const res = await fetch("/api/campaign-templates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, payload: p, clientId })
        });
        const j = (await res.json()) as { ok?: boolean; template?: { id: string }; error?: string };
        if (!j.ok || !j.template) throw new Error(j.error ?? "saveFailed");
        setDraftId(j.template.id);
        draftIdRef.current = j.template.id;
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path.endsWith("/campaigns/new") && !path.includes(j.template.id)) {
            window.history.replaceState(null, "", path.replace(/\/campaigns\/new\/?$/, `/campaigns/new/${j.template.id}`));
          }
        }
      }
      setDraftName(name);
      setLastSavedAt(new Date());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "saveFailed");
    } finally {
      setSaving(false);
    }
  }, [clients, locale]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(), 1000);
  }, [persist]);

  const updatePayload = useCallback(
    (patch: Partial<CampaignDraftPayload> | ((p: CampaignDraftPayload) => CampaignDraftPayload)) => {
      setPayload((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        if (patch && typeof patch !== "function" && !patch.campaign?.name) {
          /* keep name */
        } else if (next.campaign.name && next.campaign.name !== draftNameRef.current) {
          draftNameRef.current = next.campaign.name;
          setDraftName(next.campaign.name);
        }
        return next;
      });
      scheduleSave();
    },
    [scheduleSave]
  );

  const showMobileValidationToast = useCallback(
    (variant: MobileValidationToast["variant"], message: string) => {
      mobileToastNonce.current += 1;
      setMobileValidationToast({ variant, message, nonce: mobileToastNonce.current });
    },
    []
  );

  const clearMobileValidationToast = useCallback(() => {
    setMobileValidationToast(null);
  }, []);

  const setActiveNodeWrapped = useCallback(
    (n: CreatorNode) => {
      setActiveNode(n);
      updatePayload((p) =>
        patchWizardNavigation(
          {
            ...p,
            visitedNodes: p.visitedNodes.includes(n) ? p.visitedNodes : [...p.visitedNodes, n]
          },
          { activeNode: n }
        )
      );
    },
    [updatePayload]
  );

  const value = useMemo(
    () => ({
      draftId,
      draftName,
      payload,
      activeNode,
      setActiveNode: setActiveNodeWrapped,
      updatePayload,
      saving,
      saveError,
      lastSavedAt,
      clients,
      clientsLoading,
      objectiveChosen,
      setObjectiveChosen,
      flushSave: persist,
      addAdMode: isAddAdDraft(payload),
      addAdsetMode: payload.meta?.publishMode === "add_adset",
      inheritCampaignMode: isInheritedCampaignDraft(payload),
      addAdLoading,
      mobileValidationToast,
      showMobileValidationToast,
      clearMobileValidationToast
    }),
    [
      draftId,
      draftName,
      payload,
      activeNode,
      setActiveNodeWrapped,
      updatePayload,
      saving,
      saveError,
      lastSavedAt,
      clients,
      clientsLoading,
      objectiveChosen,
      persist,
      addAdLoading,
      mobileValidationToast,
      showMobileValidationToast,
      clearMobileValidationToast
    ]
  );

  return <CampaignDraftContext.Provider value={value}>{children}</CampaignDraftContext.Provider>;
}

export function useCampaignDraft() {
  const ctx = useContext(CampaignDraftContext);
  if (!ctx) throw new Error("useCampaignDraft must be used within CampaignDraftProvider");
  return ctx;
}
