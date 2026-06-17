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
import { useLocale } from "next-intl";

import {
  type CampaignDraftPayload,
  type AdDraftItem,
  type CreatorNode,
  defaultAdItem,
  defaultCampaignDraft,
  isAddAdDraft,
  newDraftId,
  parseCampaignDraftPayload
} from "@/lib/campaign-draft";

type ClientOption = { id: string; slug: string; name: string };

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
  objectiveChosen: boolean;
  setObjectiveChosen: (v: boolean) => void;
  flushSave: () => Promise<void>;
  addAdMode: boolean;
  addAdLoading: boolean;
};

const CampaignDraftContext = createContext<CampaignDraftContextValue | null>(null);

export function CampaignDraftProvider({
  children,
  initialDraftId,
  initialClientSlug,
  initialAddAd
}: {
  children: ReactNode;
  initialDraftId?: string;
  initialClientSlug?: string;
  initialAddAd?: {
    fromCampaignId: string;
    adsetId: string;
    clientSlug?: string;
  };
}) {
  const locale = useLocale();
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [draftName, setDraftName] = useState("");
  const [payload, setPayload] = useState<CampaignDraftPayload>(() => {
    const d = defaultCampaignDraft(locale);
    if (initialClientSlug) d.clientSlug = initialClientSlug;
    return d;
  });
  const [activeNode, setActiveNode] = useState<CreatorNode>(
    initialAddAd ? "ad" : "campaign"
  );
  const [objectiveChosen, setObjectiveChosen] = useState(!!initialDraftId || !!initialAddAd);
  const [addAdLoading, setAddAdLoading] = useState(!!initialAddAd);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const payloadRef = useRef(payload);
  const draftIdRef = useRef(draftId);
  const draftNameRef = useRef(draftName);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  payloadRef.current = payload;
  draftIdRef.current = draftId;
  draftNameRef.current = draftName;

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j: { clients?: ClientOption[] }) => setClients(j.clients ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!initialDraftId) return;
    fetch(`/api/campaign-templates/${encodeURIComponent(initialDraftId)}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; template?: { id: string; name: string; payload: unknown } }) => {
        if (!j.ok || !j.template) return;
        setDraftId(j.template.id);
        setDraftName(j.template.name);
        setPayload(parseCampaignDraftPayload(j.template.payload));
        setObjectiveChosen(true);
      })
      .catch(() => {});
  }, [initialDraftId]);

  useEffect(() => {
    if (!initialAddAd) return;
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
          error?: string;
        }) => {
          if (!j.ok || !j.patch) return;
          const adId = newDraftId();
          const adsetDraftId = newDraftId();
          const base = defaultCampaignDraft(locale);
          const inherited = j.inheritedAd ?? {};
          const freshAd = {
            ...defaultAdItem(locale),
            ...inherited,
            id: adId,
            name: locale === "en" ? "New Ad" : "Novo anúncio",
            titles: [],
            bodies: [],
            imageHashes: [],
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
                id: adsetDraftId,
                name: j.adsetName ?? base.adsets[0]!.name
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
              targetAdsetName: j.adsetName
            }
          });
          setPayload(next);
          setActiveNode("ad");
          setObjectiveChosen(true);
        }
      )
      .catch(() => {})
      .finally(() => setAddAdLoading(false));
  }, [initialAddAd, locale]);

  const persist = useCallback(async () => {
    if (isAddAdDraft(payloadRef.current)) return;
    const p = payloadRef.current;
    const name = draftNameRef.current || p.campaign.name || "Rascunho";
    setSaving(true);
    setSaveError(null);
    try {
      if (draftIdRef.current) {
        const res = await fetch(`/api/campaign-templates/${encodeURIComponent(draftIdRef.current)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, payload: p })
        });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error ?? "saveFailed");
      } else {
        const res = await fetch("/api/campaign-templates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, payload: p })
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
  }, []);

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

  const setActiveNodeWrapped = useCallback(
    (n: CreatorNode) => {
      setActiveNode(n);
      updatePayload((p) => ({
        ...p,
        visitedNodes: p.visitedNodes.includes(n) ? p.visitedNodes : [...p.visitedNodes, n]
      }));
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
      objectiveChosen,
      setObjectiveChosen,
      flushSave: persist,
      addAdMode: isAddAdDraft(payload),
      addAdLoading
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
      objectiveChosen,
      persist,
      addAdLoading
    ]
  );

  return <CampaignDraftContext.Provider value={value}>{children}</CampaignDraftContext.Provider>;
}

export function useCampaignDraft() {
  const ctx = useContext(CampaignDraftContext);
  if (!ctx) throw new Error("useCampaignDraft must be used within CampaignDraftProvider");
  return ctx;
}
