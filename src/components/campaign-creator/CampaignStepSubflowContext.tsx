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
import type { CampaignDraftPayload } from "@/lib/campaign-draft";

export const CAMPAIGN_SUB_STEPS = ["client", "account", "basics", "budget"] as const;
export type CampaignSubStep = (typeof CAMPAIGN_SUB_STEPS)[number];

export function validateCampaignSubStep(
  payload: CampaignDraftPayload,
  subStep: CampaignSubStep
): string | null {
  switch (subStep) {
    case "client":
      if (!payload.clientSlug.trim()) return "clientRequired";
      return null;
    case "account":
      if (!payload.adAccountId.trim()) return "adAccountRequired";
      if (payload.copyFromCampaignEnabled && !payload.copyFromCampaignId) return "copyCampaignRequired";
      return null;
    case "basics":
      if (!payload.campaign.name.trim()) return "campaignNameRequired";
      return null;
    case "budget":
      if (payload.campaign.dailyBudgetBRL < 1) return "budgetRequired";
      return null;
  }
}

type SubflowContextValue = {
  subStep: CampaignSubStep;
  subStepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  canGoTo: (step: CampaignSubStep) => boolean;
  goTo: (step: CampaignSubStep) => void;
  goNext: () => boolean;
  goPrev: () => boolean;
  validateCurrent: () => string | null;
};

const SubflowContext = createContext<SubflowContextValue | null>(null);

export function CampaignStepSubflowProvider({ children }: { children: ReactNode }) {
  const { activeNode } = useCampaignDraft();
  const [subStep, setSubStep] = useState<CampaignSubStep>("client");
  const [visitedThrough, setVisitedThrough] = useState(0);
  const prevActiveNode = useRef(activeNode);

  useEffect(() => {
    if (activeNode === "campaign" && prevActiveNode.current !== "campaign") {
      setSubStep("client");
      setVisitedThrough(0);
    }
    prevActiveNode.current = activeNode;
  }, [activeNode]);

  const subStepIndex = CAMPAIGN_SUB_STEPS.indexOf(subStep);

  const canGoTo = useCallback(
    (step: CampaignSubStep) => {
      if (activeNode !== "campaign") return false;
      const idx = CAMPAIGN_SUB_STEPS.indexOf(step);
      return idx <= visitedThrough || idx === subStepIndex;
    },
    [activeNode, subStepIndex, visitedThrough]
  );

  const goTo = useCallback(
    (step: CampaignSubStep) => {
      if (!canGoTo(step)) return;
      setSubStep(step);
    },
    [canGoTo]
  );

  const goNext = useCallback(() => {
    if (subStepIndex >= CAMPAIGN_SUB_STEPS.length - 1) return false;
    const next = CAMPAIGN_SUB_STEPS[subStepIndex + 1]!;
    setVisitedThrough((v) => Math.max(v, subStepIndex + 1));
    setSubStep(next);
    return true;
  }, [subStepIndex]);

  const goPrev = useCallback(() => {
    if (subStepIndex <= 0) return false;
    setSubStep(CAMPAIGN_SUB_STEPS[subStepIndex - 1]!);
    return true;
  }, [subStepIndex]);

  const { payload } = useCampaignDraft();
  const validateCurrent = useCallback(
    () => validateCampaignSubStep(payload, subStep),
    [payload, subStep]
  );

  const value = useMemo(
    (): SubflowContextValue => ({
      subStep,
      subStepIndex,
      isFirst: subStepIndex === 0,
      isLast: subStepIndex === CAMPAIGN_SUB_STEPS.length - 1,
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

export function useCampaignStepSubflow() {
  const ctx = useContext(SubflowContext);
  if (!ctx) throw new Error("useCampaignStepSubflow requires CampaignStepSubflowProvider");
  return ctx;
}

export function useCampaignStepSubflowOptional() {
  return useContext(SubflowContext);
}
