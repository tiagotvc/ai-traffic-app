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
import { patchWizardNavigation, type CampaignDraftPayload } from "@/lib/campaign-draft";

export const CAMPAIGN_SECTIONS = ["objective", "budget"] as const;
export type CampaignSection = (typeof CAMPAIGN_SECTIONS)[number];

/** Legacy persisted section — merged into objective screen. */
export type LegacyCampaignSection = "clientAccountIdentity";

export function normalizeCampaignSection(
  section: string | undefined
): CampaignSection {
  if (section === "budget") return "budget";
  return "objective";
}

function migrateVisitedThrough(section: string | undefined): number {
  if (section === "budget") return 1;
  if (section === "clientAccountIdentity") return 1;
  return 0;
}

function validateObjectiveSetup(payload: CampaignDraftPayload): string | null {
  if (!payload.clientSlug.trim()) return "clientRequired";
  if (!payload.adAccountId.trim()) return "adAccountRequired";
  if (payload.copyFromCampaignEnabled && !payload.copyFromCampaignId) return "copyCampaignRequired";
  if (!payload.campaign.name.trim()) return "campaignNameRequired";
  return null;
}

export function validateCampaignSection(
  payload: CampaignDraftPayload,
  section: CampaignSection
): string | null {
  switch (section) {
    case "objective":
      return validateObjectiveSetup(payload);
    case "budget":
      if (payload.campaign.dailyBudgetBRL < 1) return "budgetRequired";
      return null;
  }
}

type SubflowContextValue = {
  section: CampaignSection;
  sectionIndex: number;
  isFirst: boolean;
  isLast: boolean;
  canGoTo: (section: CampaignSection) => boolean;
  isSectionVisited: (section: CampaignSection) => boolean;
  goTo: (section: CampaignSection) => void;
  goNext: () => boolean;
  goPrev: () => boolean;
  validateCurrent: () => string | null;
};

const SubflowContext = createContext<SubflowContextValue | null>(null);

export function CampaignStepSubflowProvider({ children }: { children: ReactNode }) {
  const { activeNode, payload, updatePayload } = useCampaignDraft();
  const savedSection = payload.meta?.wizardNavigation?.campaignSection;
  const [section, setSection] = useState<CampaignSection>(() =>
    normalizeCampaignSection(savedSection)
  );
  const [visitedThrough, setVisitedThrough] = useState(() => migrateVisitedThrough(savedSection));
  const prevActiveNode = useRef(activeNode);

  const persistSection = useCallback(
    (next: CampaignSection) => {
      updatePayload((p) => patchWizardNavigation(p, { campaignSection: next }));
    },
    [updatePayload]
  );

  useEffect(() => {
    if (activeNode === "campaign" && prevActiveNode.current !== "campaign") {
      const restored = normalizeCampaignSection(payload.meta?.wizardNavigation?.campaignSection);
      setSection(restored);
      setVisitedThrough(migrateVisitedThrough(payload.meta?.wizardNavigation?.campaignSection));
    }
    prevActiveNode.current = activeNode;
  }, [activeNode, payload.meta?.wizardNavigation?.campaignSection]);

  const sectionIndex = CAMPAIGN_SECTIONS.indexOf(section);

  const canGoTo = useCallback(
    (target: CampaignSection) => {
      if (activeNode !== "campaign") return false;
      const idx = CAMPAIGN_SECTIONS.indexOf(target);
      return idx <= visitedThrough || idx === sectionIndex;
    },
    [activeNode, sectionIndex, visitedThrough]
  );

  const isSectionVisited = useCallback(
    (target: CampaignSection) => {
      const idx = CAMPAIGN_SECTIONS.indexOf(target);
      return idx <= visitedThrough;
    },
    [visitedThrough]
  );

  const goTo = useCallback(
    (target: CampaignSection) => {
      if (!canGoTo(target)) return;
      setSection(target);
      persistSection(target);
    },
    [canGoTo, persistSection]
  );

  const goNext = useCallback(() => {
    if (sectionIndex >= CAMPAIGN_SECTIONS.length - 1) return false;
    const next = CAMPAIGN_SECTIONS[sectionIndex + 1]!;
    setVisitedThrough((v) => Math.max(v, sectionIndex + 1));
    setSection(next);
    persistSection(next);
    return true;
  }, [sectionIndex, persistSection]);

  const goPrev = useCallback(() => {
    if (sectionIndex <= 0) return false;
    const prev = CAMPAIGN_SECTIONS[sectionIndex - 1]!;
    setSection(prev);
    persistSection(prev);
    return true;
  }, [sectionIndex, persistSection]);

  const validateCurrent = useCallback(
    () => validateCampaignSection(payload, section),
    [payload, section]
  );

  const value = useMemo(
    (): SubflowContextValue => ({
      section,
      sectionIndex,
      isFirst: sectionIndex === 0,
      isLast: sectionIndex === CAMPAIGN_SECTIONS.length - 1,
      canGoTo,
      isSectionVisited,
      goTo,
      goNext,
      goPrev,
      validateCurrent
    }),
    [section, sectionIndex, canGoTo, isSectionVisited, goTo, goNext, goPrev, validateCurrent]
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
