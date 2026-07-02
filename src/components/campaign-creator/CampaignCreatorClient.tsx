"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { CampaignCreatorFooter } from "@/components/campaign-creator/CampaignCreatorFooter";
import { CampaignCreatorHeader } from "@/components/campaign-creator/CampaignCreatorHeader";
import { CampaignCreatorPreview } from "@/components/campaign-creator/CampaignCreatorPreview";
import { CampaignCreatorStepPanel } from "@/components/campaign-creator/CampaignCreatorStepPanel";
import { CampaignCreatorTree } from "@/components/campaign-creator/CampaignCreatorTree";
import {
  CampaignCreatorUxHeader,
  CampaignCreatorUxStatusToast,
  CampaignCreatorUxNav,
  CampaignCreatorUxStepperRow
} from "@/uxpilot-ui/adapters/CampaignCreatorUxChrome";
import { CampaignCreatorUxSidebar } from "@/uxpilot-ui/adapters/CampaignCreatorUxSidebar";
import { OrionCommanderCompactCard } from "@/components/campaign-creator/commander/OrionCommanderMobile";
import { useCommanderAccess } from "@/hooks/useCommanderAccess";
import {
  CampaignDraftProvider,
  useCampaignDraft
} from "@/components/campaign-creator/CampaignDraftContext";
import { CampaignStepSubflowProvider } from "@/components/campaign-creator/CampaignStepSubflowContext";
import { AdSetStepSubflowProvider } from "@/components/campaign-creator/AdSetStepSubflowContext";
import { AdStepSubflowProvider } from "@/components/campaign-creator/AdStepSubflowContext";
import { ObjectiveSelectModal } from "@/components/campaign-creator/ObjectiveSelectModal";
import type { PersonaTargetingIssue } from "@/lib/persona-targeting-types";
import { PersonaTargetingRepairModal } from "@/components/campaign-creator/PersonaTargetingRepairModal";
import { extractPersonaTargetingItems } from "@/lib/audience-targeting-shared";
import { CampaignPublishErrorAlert } from "@/components/campaign-creator/CampaignPublishErrorAlert";
import { CampaignPublishOverlay } from "@/components/campaign-creator/CampaignPublishOverlay";
import {
  startMetaPublishWaitCycle,
  type CampaignPublishProgressStep
} from "@/lib/campaign-publish-progress";
import { AdSetStep } from "@/components/campaign-creator/steps/AdSetStep";
import { AdStep } from "@/components/campaign-creator/steps/AdStep";
import { CampaignStep } from "@/components/campaign-creator/steps/CampaignStep";
import { ReviewStep } from "@/components/campaign-creator/steps/ReviewStep";
import { useRouter } from "@/i18n/navigation";
import { getActiveAd, getActiveAdset, isAddAdDraft, isAddAdsetDraft, type CreatorNode, validatePublishDraft } from "@/lib/campaign-draft";

const STEP_ORDER: CreatorNode[] = ["campaign", "adset", "ad", "review"];

function CampaignCreatorInner({ variant = "uxpilot" }: { variant?: "legacy" | "uxpilot" }) {
  const t = useTranslations("campaignCreator");
  const router = useRouter();
  const { commander } = useCommanderAccess();
  const {
    activeNode,
    payload,
    objectiveChosen,
    setObjectiveChosen,
    draftId,
    updatePayload,
    flushSave,
    addAdMode,
    addAdsetMode,
    inheritCampaignMode,
    addAdLoading,
    showMobileValidationToast
  } = useCampaignDraft();
  const [showObjective, setShowObjective] = useState(!objectiveChosen && !inheritCampaignMode);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [repairIssues, setRepairIssues] = useState<PersonaTargetingIssue[]>([]);
  const [repairOpen, setRepairOpen] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [showTargetingFixLink, setShowTargetingFixLink] = useState(false);
  const [repairNotice, setRepairNotice] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishProgressStep, setPublishProgressStep] = useState<CampaignPublishProgressStep | null>(
    null
  );
  const prevNodeRef = useRef(activeNode);
  const [stepDirection, setStepDirection] = useState<"forward" | "back" | "none">("none");

  useEffect(() => {
    const prev = prevNodeRef.current;
    if (prev !== activeNode) {
      const pi = STEP_ORDER.indexOf(prev);
      const ci = STEP_ORDER.indexOf(activeNode);
      if (pi >= 0 && ci >= 0) setStepDirection(ci > pi ? "forward" : "back");
      prevNodeRef.current = activeNode;
    }
  }, [activeNode]);

  const collectDraftPersonaIds = useCallback(() => {
    return [
      ...new Set(
        payload.adsets
          .filter(
            (adset) => (adset.targetingMode ?? "compiler") === "compiler" && !!adset.personaId
          )
          .map((adset) => adset.personaId as string)
      )
    ];
  }, [payload.adsets]);

  const fetchPersonaIssues = useCallback(
    async (options?: { forRepair?: boolean }): Promise<PersonaTargetingIssue[]> => {
    const personaIds = collectDraftPersonaIds();
    if (!personaIds.length || !payload.adAccountId) return [];
    const forRepair = options?.forRepair ?? false;

    const res = await fetch("/api/personas/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        adAccountId: payload.adAccountId,
        personaIds,
        findReplacements: forRepair,
        includeSummaries: forRepair
      })
    });
    const j = (await res.json()) as { issues?: PersonaTargetingIssue[] };
    return j.issues ?? [];
  },
    [collectDraftPersonaIds, payload.adAccountId]
  );

  const replacePersonaInDraft = useCallback(
    (oldId: string, newId: string) => {
      updatePayload((prev) => ({
        ...prev,
        adsets: prev.adsets.map((adset) =>
          adset.personaId === oldId ? { ...adset, personaId: newId } : adset
        )
      }));
    },
    [updatePayload]
  );

  function isTargetingErrorMessage(msg?: string) {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return (
      lower.includes("descontinu") ||
      lower.includes("no longer available") ||
      lower.includes("não está mais disponível") ||
      lower.includes("not available") ||
      lower.includes("categoria") ||
      lower.includes("category") ||
      lower.includes("1487694") ||
      lower.includes("targeting")
    );
  }

  const buildFallbackPersonaIssues = useCallback(async (): Promise<PersonaTargetingIssue[]> => {
    const personaIds = collectDraftPersonaIds();
    if (!personaIds.length) return [];

    const res = await fetch("/api/personas");
    const j = (await res.json()) as {
      personas?: Array<{
        id: string;
        name: string;
        description: string | null;
        sourcePrompt: string | null;
        ageMin: number;
        ageMax: number;
        gender: string;
        targeting: Record<string, unknown>;
      }>;
    };

    const byId = new Map((j.personas ?? []).map((p) => [p.id, p]));

    return personaIds.flatMap((personaId) => {
      const persona = byId.get(personaId);
      if (!persona) return [];

      const raw = extractPersonaTargetingItems(persona.targeting);
      const segments =
        raw.length > 0
          ? raw.map((s) => ({ ...s, valid: false }))
          : [
              {
                id: "meta-rejected",
                name: t("personaTargetingUnknownDiscontinued"),
                type: "interest" as const,
                valid: false
              }
            ];

      return [
        {
          personaId,
          personaName: persona.name,
          description: persona.description,
          sourcePrompt: persona.sourcePrompt,
          ageMin: persona.ageMin,
          ageMax: persona.ageMax,
          gender: persona.gender,
          segments,
          invalidSegments: segments.filter((s) => !s.valid),
          validSegments: segments.filter((s) => s.valid),
          replacements: [],
          allSegmentsInvalid: segments.every((s) => !s.valid)
        }
      ];
    });
  }, [collectDraftPersonaIds, t]);

  const openTargetingRepair = useCallback(async () => {
    setRepairLoading(true);
    setRepairOpen(true);
    setPublishError(null);
    setShowTargetingFixLink(false);

    let issues = await fetchPersonaIssues({ forRepair: true });
    if (!issues.length) {
      issues = await buildFallbackPersonaIssues();
    }

    setRepairIssues(issues);
    setRepairLoading(false);

    if (!issues.length) {
      setPublishError(t("personaTargetingNoPersonaToFix"));
      setRepairOpen(false);
    }
  }, [buildFallbackPersonaIssues, fetchPersonaIssues, t]);

  const handleTargetingPublishFailure = useCallback(
    async (msg: string) => {
      setPublishError(msg);
      if (isTargetingErrorMessage(msg) && collectDraftPersonaIds().length > 0) {
        setShowTargetingFixLink(true);
        return;
      }
      setShowTargetingFixLink(false);
    },
    [collectDraftPersonaIds]
  );

  const runPublish = useCallback(async () => {
    setPublishing(true);
    setPublishProgressStep("preparing");
    try {
    if (isAddAdDraft(payload)) {
      const adsetId = payload.meta?.targetMetaAdsetId;
      const campaignId = payload.meta?.targetMetaCampaignId;
      if (!adsetId || !campaignId) {
        setPublishError(t("publishFailed"));
        return;
      }

      setPublishProgressStep("publishingAd");
      const stopWait = startMetaPublishWaitCycle(setPublishProgressStep, 3000);
      let res: Response;
      try {
        res = await fetch(`/api/adsets/${encodeURIComponent(adsetId)}/ads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: payload.clientSlug,
          adAccountId: payload.adAccountId,
          objective: payload.objective,
          ad: getActiveAd(payload),
          campaignName: payload.campaign.name
        })
      });
      } finally {
        stopWait();
      }
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!j.ok) {
        setPublishError(j.message ?? j.error ?? t("publishFailed"));
        return;
      }
      setPublishProgressStep("syncing");
      void fetch("/api/meta/discover", { method: "POST" }).catch(() => {});
      const qs = new URLSearchParams();
      if (payload.clientSlug) qs.set("client", payload.clientSlug);
      qs.set("adset", adsetId);
      router.push(`/campaigns/${campaignId}/ads?${qs.toString()}`);
      return;
    }

    if (isAddAdsetDraft(payload)) {
      const campaignId = payload.meta?.targetMetaCampaignId;
      if (!campaignId) {
        setPublishError(t("publishFailed"));
        return;
      }

      setPublishProgressStep("validatingPersonas");
      const issues = await fetchPersonaIssues();
      if (issues.length) {
        setRepairIssues(issues);
        setRepairOpen(true);
        return;
      }

      setPublishProgressStep("publishingAdset");
      const stopWait = startMetaPublishWaitCycle(setPublishProgressStep, 3000);
      let res: Response;
      try {
        res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/adsets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: payload.clientSlug,
          adAccountId: payload.adAccountId,
          objective: payload.objective,
          adset: getActiveAdset(payload),
          ad: getActiveAd(payload),
          campaignName: payload.campaign.name,
          campaign: payload.campaign
        })
      });
      } finally {
        stopWait();
      }
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        errorCode?: string;
        adsetId?: string;
      };
      if (!j.ok || !j.adsetId) {
        if (j.errorCode === "TARGETING_INVALID" || isTargetingErrorMessage(j.message ?? j.error)) {
          const retryIssues = await fetchPersonaIssues({ forRepair: true });
          if (retryIssues.length) {
            setRepairIssues(retryIssues);
            setRepairOpen(true);
            setShowTargetingFixLink(false);
            return;
          }
          await handleTargetingPublishFailure(j.message ?? j.error ?? t("publishFailed"));
          return;
        }
        setShowTargetingFixLink(false);
        setPublishError(j.message ?? j.error ?? t("publishFailed"));
        return;
      }
      setPublishProgressStep("syncing");
      void fetch("/api/meta/discover", { method: "POST" }).catch(() => {});
      const qs = new URLSearchParams();
      if (payload.clientSlug) qs.set("client", payload.clientSlug);
      router.push(`/campaigns/${campaignId}/adsets?${qs.toString()}`);
      return;
    }

    setPublishProgressStep("validatingPersonas");
    const issues = await fetchPersonaIssues();
    if (issues.length) {
      setRepairIssues(issues);
      setRepairOpen(true);
      return;
    }

    setPublishProgressStep("savingDraft");
    await flushSave();
    const stopWait = startMetaPublishWaitCycle(setPublishProgressStep);
    let res: Response;
    try {
      res = await fetch("/api/meta/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId: payload.clientSlug,
        draft: payload,
        draftTemplateId: draftId ?? undefined
      })
    });
    } finally {
      stopWait();
    }
    const j = (await res.json()) as {
      ok?: boolean;
      campaignId?: string;
      error?: string;
      message?: string;
      errorCode?: string;
    };
    if (!j.ok || !j.campaignId) {
      if (j.errorCode === "TARGETING_INVALID" || isTargetingErrorMessage(j.message ?? j.error)) {
        const retryIssues = await fetchPersonaIssues({ forRepair: true });
        if (retryIssues.length) {
          setRepairIssues(retryIssues);
          setRepairOpen(true);
          setShowTargetingFixLink(false);
          return;
        }
        await handleTargetingPublishFailure(j.message ?? j.error ?? t("publishFailed"));
        return;
      }
      setShowTargetingFixLink(false);
      setPublishError(j.message ?? j.error ?? t("publishFailed"));
      return;
    }
    setPublishProgressStep("syncing");
    void fetch("/api/meta/discover", { method: "POST" }).catch(() => {});
    const qs = payload.clientSlug ? `?client=${encodeURIComponent(payload.clientSlug)}` : "";
    router.push(`/campaigns/${j.campaignId}${qs}`);
    } finally {
      setPublishProgressStep(null);
      setPublishing(false);
    }
  }, [draftId, fetchPersonaIssues, flushSave, handleTargetingPublishFailure, payload, router, t]);

  const handlePublish = useCallback(() => {
    setPublishError(null);
    setRepairNotice(null);
    setShowTargetingFixLink(false);
    const err = validatePublishDraft(payload);
    if (err) {
      const message = t(err as Parameters<typeof t>[0]);
      setPublishError(message);
      showMobileValidationToast("error", message);
      return;
    }

    void runPublish();
  }, [payload, runPublish, showMobileValidationToast, t]);

  const repairModal = (
    <PersonaTargetingRepairModal
      open={repairOpen}
      loading={repairLoading}
      issues={repairIssues}
      clientSlug={payload.clientSlug}
      adAccountId={payload.adAccountId}
      onClose={() => setRepairOpen(false)}
      onResolved={({ retryPublish } = {}) => {
        setRepairOpen(false);
        setRepairIssues([]);
        setShowTargetingFixLink(false);
        if (retryPublish) {
          setRepairNotice(null);
          void runPublish();
        } else {
          setPublishError(null);
          setRepairNotice(t("personaTargetingRepairSaved"));
        }
      }}
      onPersonaReplaced={replacePersonaInDraft}
    />
  );

  const publishErrorAlert =
    publishError ? (
      <CampaignPublishErrorAlert
        message={publishError}
        showFixLink={showTargetingFixLink}
        onFix={() => void openTargetingRepair()}
      />
    ) : null;

  const repairNoticeAlert = repairNotice ? (
    <p className="ui-alert-success text-sm">{repairNotice}</p>
  ) : null;

  useEffect(() => {
    if (variant !== "uxpilot") return;
    const shell = document.querySelector<HTMLElement>("[data-campaign-creator-shell]")?.closest("main");
    if (!shell) return;
    const prevOverflow = shell.style.overflow;
    const prevDisplay = shell.style.display;
    const prevFlexDirection = shell.style.flexDirection;
    shell.style.overflow = "hidden";
    shell.style.display = "flex";
    shell.style.flexDirection = "column";
    return () => {
      shell.style.overflow = prevOverflow;
      shell.style.display = prevDisplay;
      shell.style.flexDirection = prevFlexDirection;
    };
  }, [variant]);

  if (addAdLoading) {
    return (
      <div
        className={
          variant === "uxpilot"
            ? "flex min-h-0 flex-1 items-center justify-center"
            : "-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--surface)]"
        }
      >
        <p className="text-sm text-[var(--text-dim)]">{t("addAdLoading")}</p>
      </div>
    );
  }

  const stepPanel = (
    <CampaignCreatorStepPanel stepKey={activeNode} direction={stepDirection}>
      {!addAdMode && activeNode === "campaign" ? <CampaignStep /> : null}
      {!addAdMode && activeNode === "adset" ? <AdSetStep /> : null}
      {activeNode === "ad" ? <AdStep /> : null}
      {activeNode === "review" ? <ReviewStep /> : null}
    </CampaignCreatorStepPanel>
  );

  if (variant === "uxpilot") {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: "var(--surface-bg)" }}>
          <CampaignCreatorUxHeader />
          <CampaignCreatorUxStatusToast />
          <div
            className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] gap-x-8 overflow-x-visible overflow-y-hidden px-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:pl-8 lg:pr-4 xl:grid-cols-[minmax(0,1fr)_22rem]"
          >
            <CampaignCreatorUxStepperRow />

            <main className="relative col-start-1 row-start-2 flex min-h-0 min-w-0 w-full flex-col overflow-x-visible overflow-y-hidden py-3">
              <div
                className={
                  activeNode === "campaign" || activeNode === "adset" || activeNode === "ad"
                    ? "campaign-creator-main-scroll flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-visible overflow-y-auto lg:overflow-y-hidden"
                    : "campaign-creator-main-scroll min-h-0 min-w-0 w-full flex-1 overflow-y-auto"
                }
              >
                <div className="campaign-creator-main-scroll__inner flex min-h-0 min-w-0 w-full flex-1 flex-col">
                {stepPanel}
                {publishErrorAlert}
                {repairNoticeAlert}
                </div>
              </div>
            </main>

            <aside className="campaign-creator-sidebar hidden min-h-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col lg:overflow-hidden">
              <CampaignCreatorUxSidebar onPublish={handlePublish} publishing={publishing} />
            </aside>
          </div>

          <div className="campaign-creator-footer-outer relative z-[60] shrink-0 lg:hidden">
            <div className="campaign-creator-footer-band">
              {commander ? <OrionCommanderCompactCard /> : null}
              <CampaignCreatorUxNav
                onPublish={handlePublish}
                publishing={publishing}
                placement="footer"
              />
            </div>
          </div>
          {repairModal}
          <CampaignPublishOverlay open={publishing} step={publishProgressStep} />
        </div>
    );
  }

  return (
    <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] flex-col bg-[var(--surface)]">
      <ObjectiveSelectModal
        open={!inheritCampaignMode && (showObjective || !objectiveChosen)}
        onClose={() => {
          if (objectiveChosen) setShowObjective(false);
        }}
      />
      <CampaignCreatorHeader />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-56 shrink-0 border-r border-[var(--border-color)] bg-[var(--surface-card)] lg:block">
          <CampaignCreatorTree />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            <CampaignCreatorStepPanel
              stepKey={activeNode}
              direction={stepDirection}
            >
              {!inheritCampaignMode && activeNode === "campaign" ? <CampaignStep /> : null}
              {(!addAdMode && activeNode === "adset") || (addAdsetMode && activeNode === "adset") ? (
                <AdSetStep />
              ) : null}
              {activeNode === "ad" ? <AdStep /> : null}
              {activeNode === "review" ? <ReviewStep /> : null}
            </CampaignCreatorStepPanel>
            {publishErrorAlert}
          </div>
        </main>
        <div className="hidden w-72 shrink-0 border-l border-[var(--border-color)] bg-[var(--surface-card)] xl:block">
          <CampaignCreatorPreview />
        </div>
      </div>
      <CampaignCreatorFooter onPublish={handlePublish} publishing={publishing} />
      {repairModal}
      <CampaignPublishOverlay open={publishing} step={publishProgressStep} />
    </div>
  );
}

export function CampaignCreatorClient({
  initialDraftId,
  initialClientSlug,
  initialAddAd,
  initialAddAdset,
  initialActiveNode,
  variant = "uxpilot"
}: {
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
  variant?: "legacy" | "uxpilot";
}) {
  return (
    <CampaignDraftProvider
      initialDraftId={initialDraftId}
      initialClientSlug={initialClientSlug}
      initialAddAd={initialAddAd}
      initialAddAdset={initialAddAdset}
      initialActiveNode={initialActiveNode}
    >
      <CampaignStepSubflowProvider>
        <AdSetStepSubflowProvider>
          <AdStepSubflowProvider>
            <CampaignCreatorInner variant={variant} />
          </AdStepSubflowProvider>
        </AdSetStepSubflowProvider>
      </CampaignStepSubflowProvider>
    </CampaignDraftProvider>
  );
}
