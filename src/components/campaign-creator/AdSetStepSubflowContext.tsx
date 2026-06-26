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

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { getActiveAdset, type CampaignDraftPayload } from "@/lib/campaign-draft";

export const ADSET_SUB_STEPS = ["basics", "audience", "schedule", "placements"] as const;
export type AdSetSubStep = (typeof ADSET_SUB_STEPS)[number];

function validateAudience(payload: CampaignDraftPayload): string | null {
  const adset = getActiveAdset(payload);
  const t = adset.targeting;
  const mode = adset.targetingMode ?? "compiler";
  const hasCompilerPair = !!(adset.personaId && adset.zoneId);
  const hasMetaSaved = !!(adset.metaSavedAudienceId || t.customAudienceIds.length);
  const hasManualGeo = t.locations.length > 0;

  if (mode === "compiler") {
    if (!hasCompilerPair && !t.customAudienceIds.length && !hasManualGeo) return "audienceRequired";
  } else if (mode === "meta_saved") {
    if (!hasMetaSaved) return "audienceRequired";
  } else if (!hasManualGeo && !t.customAudienceIds.length) {
    return "audienceRequired";
  }
  return null;
}

export function validateAdSetSubStep(
  payload: CampaignDraftPayload,
  subStep: AdSetSubStep
): string | null {
  const adset = getActiveAdset(payload);

  switch (subStep) {
    case "basics": {
      if (!adset.name.trim()) return "adsetNameRequired";
      if (
        (adset.conversionLocation === "website" || adset.conversionLocation === "website_and_form") &&
        (payload.objective === "leads" || payload.objective === "sales") &&
        !adset.pixelId
      ) {
        return "pixelRequired";
      }
      if (
        adset.pixelId &&
        (payload.objective === "leads" || payload.objective === "sales") &&
        (adset.conversionLocation === "website" || adset.conversionLocation === "website_and_form") &&
        !adset.conversionEvent.trim()
      ) {
        return "conversionEventRequired";
      }
      if (adset.conversionLocation === "messaging" && !adset.messagingChannels.length) {
        return "messagingChannelRequired";
      }
      return null;
    }
    case "audience":
      return validateAudience(payload);
    case "schedule":
    case "placements":
      return null;
  }
}

type SubflowContextValue = {
  subStep: AdSetSubStep;
  subStepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  canGoTo: (step: AdSetSubStep) => boolean;
  goTo: (step: AdSetSubStep) => void;
  goNext: () => boolean;
  goPrev: () => boolean;
  validateCurrent: () => string | null;
};

const SubflowContext = createContext<SubflowContextValue | null>(null);

export function AdSetStepSubflowProvider({ children }: { children: ReactNode }) {
  const { activeNode } = useCampaignDraft();
  const [subStep, setSubStep] = useState<AdSetSubStep>("basics");
  const [visitedThrough, setVisitedThrough] = useState(0);
  const prevActiveNode = useRef(activeNode);

  useEffect(() => {
    if (activeNode === "adset" && prevActiveNode.current !== "adset") {
      setSubStep("basics");
      setVisitedThrough(0);
    }
    prevActiveNode.current = activeNode;
  }, [activeNode]);

  const subStepIndex = ADSET_SUB_STEPS.indexOf(subStep);

  const canGoTo = useCallback(
    (step: AdSetSubStep) => {
      if (activeNode !== "adset") return false;
      const idx = ADSET_SUB_STEPS.indexOf(step);
      return idx <= visitedThrough || idx === subStepIndex;
    },
    [activeNode, subStepIndex, visitedThrough]
  );

  const goTo = useCallback(
    (step: AdSetSubStep) => {
      if (!canGoTo(step)) return;
      setSubStep(step);
    },
    [canGoTo]
  );

  const goNext = useCallback(() => {
    if (subStepIndex >= ADSET_SUB_STEPS.length - 1) return false;
    const next = ADSET_SUB_STEPS[subStepIndex + 1]!;
    setVisitedThrough((v) => Math.max(v, subStepIndex + 1));
    setSubStep(next);
    return true;
  }, [subStepIndex]);

  const goPrev = useCallback(() => {
    if (subStepIndex <= 0) return false;
    setSubStep(ADSET_SUB_STEPS[subStepIndex - 1]!);
    return true;
  }, [subStepIndex]);

  const { payload } = useCampaignDraft();
  const validateCurrent = useCallback(
    () => validateAdSetSubStep(payload, subStep),
    [payload, subStep]
  );

  const value = useMemo(
    (): SubflowContextValue => ({
      subStep,
      subStepIndex,
      isFirst: subStepIndex === 0,
      isLast: subStepIndex === ADSET_SUB_STEPS.length - 1,
      canGoTo,
      goTo,
      goNext,
      goPrev,
      validateCurrent
    }),
    [subStep, subStepIndex, canGoTo, goTo, goNext, goPrev, validateCurrent]
  );

  return <SubflowContext.Provider value={value}>{children}</SubflowContext.Provider>;
}

export function useAdSetStepSubflow() {
  const ctx = useContext(SubflowContext);
  if (!ctx) throw new Error("useAdSetStepSubflow requires AdSetStepSubflowProvider");
  return ctx;
}

export function useAdSetStepSubflowOptional() {
  return useContext(SubflowContext);
}
