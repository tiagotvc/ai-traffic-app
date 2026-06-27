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
import { getActiveAdset, patchWizardNavigation, type CampaignDraftPayload } from "@/lib/campaign-draft";

/** Ad set sub-sections. Saved-audience loading lives inside "compiler" (Persona + zone). */
export const ADSET_SECTIONS = ["compiler", "advanced", "schedule"] as const;
export type AdSetSection = (typeof ADSET_SECTIONS)[number];

function normalizeAdsetSection(raw: string | undefined): AdSetSection {
  if (raw === "meta_saved") return "compiler";
  if (raw && (ADSET_SECTIONS as readonly string[]).includes(raw)) return raw as AdSetSection;
  return "compiler";
}

function validateAudience(payload: CampaignDraftPayload): string | null {
  const adset = getActiveAdset(payload);
  const t = adset.targeting;
  const mode = adset.targetingMode ?? "compiler";
  const hasCompilerPair = !!(adset.personaId && adset.zoneId);
  const hasMetaSaved = !!(adset.metaSavedAudienceId || t.customAudienceIds.length);
  const hasManualGeo = t.locations.length > 0;

  if (mode === "compiler") {
    if (!hasCompilerPair && !t.customAudienceIds.length && !hasManualGeo && !adset.metaSavedAudienceId) {
      return "audienceRequired";
    }
  } else if (mode === "meta_saved") {
    if (!hasMetaSaved) return "audienceRequired";
  } else if (!hasManualGeo && !t.customAudienceIds.length) {
    return "audienceRequired";
  }
  return null;
}

function validateBasics(payload: CampaignDraftPayload): string | null {
  const adset = getActiveAdset(payload);

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

export function validateAdSetSection(
  payload: CampaignDraftPayload,
  section: AdSetSection
): string | null {
  const adset = getActiveAdset(payload);
  const mode = adset.targetingMode ?? "compiler";

  switch (section) {
    case "compiler": {
      const basicsErr = validateBasics(payload);
      if (basicsErr) return basicsErr;
      if (mode === "compiler" || mode === "meta_saved") return validateAudience(payload);
      return null;
    }
    case "advanced":
      return mode === "advanced" ? validateAudience(payload) : null;
    case "schedule":
      return null;
  }
}

type SubflowContextValue = {
  section: AdSetSection;
  sectionIndex: number;
  isFirst: boolean;
  isLast: boolean;
  canGoTo: (section: AdSetSection) => boolean;
  isSectionVisited: (section: AdSetSection) => boolean;
  goTo: (section: AdSetSection) => void;
  goNext: () => boolean;
  goPrev: () => boolean;
  validateCurrent: () => string | null;
};

const SubflowContext = createContext<SubflowContextValue | null>(null);

export function AdSetStepSubflowProvider({ children }: { children: ReactNode }) {
  const { activeNode, payload, updatePayload } = useCampaignDraft();
  const savedSection = normalizeAdsetSection(payload.meta?.wizardNavigation?.adsetSection);
  const [section, setSection] = useState<AdSetSection>(savedSection);
  const [visitedThrough, setVisitedThrough] = useState(() =>
    Math.max(0, ADSET_SECTIONS.indexOf(savedSection))
  );
  const prevActiveNode = useRef(activeNode);

  const persistSection = useCallback(
    (next: AdSetSection) => {
      updatePayload((p) => patchWizardNavigation(p, { adsetSection: next }));
    },
    [updatePayload]
  );

  useEffect(() => {
    if (activeNode === "adset" && prevActiveNode.current !== "adset") {
      const restored = normalizeAdsetSection(payload.meta?.wizardNavigation?.adsetSection);
      setSection(restored);
      setVisitedThrough(Math.max(0, ADSET_SECTIONS.indexOf(restored)));
    }
    prevActiveNode.current = activeNode;
  }, [activeNode, payload.meta?.wizardNavigation?.adsetSection]);

  const sectionIndex = ADSET_SECTIONS.indexOf(section);

  const canGoTo = useCallback(
    (target: AdSetSection) => {
      if (activeNode !== "adset") return false;
      // Targeting method (Persona+Zone vs Advanced) and Schedule are an either/or
      // choice the user picks directly — allow free navigation between sections.
      return (ADSET_SECTIONS as readonly string[]).includes(target);
    },
    [activeNode]
  );

  const isSectionVisited = useCallback(
    (target: AdSetSection) => {
      const idx = ADSET_SECTIONS.indexOf(target);
      return idx <= visitedThrough;
    },
    [visitedThrough]
  );

  const goTo = useCallback(
    (target: AdSetSection) => {
      if (!canGoTo(target)) return;
      setVisitedThrough((v) => Math.max(v, ADSET_SECTIONS.indexOf(target)));
      setSection(target);
      persistSection(target);
    },
    [canGoTo, persistSection]
  );

  const goNext = useCallback(() => {
    if (sectionIndex >= ADSET_SECTIONS.length - 1) return false;
    const next = ADSET_SECTIONS[sectionIndex + 1]!;
    setVisitedThrough((v) => Math.max(v, sectionIndex + 1));
    setSection(next);
    persistSection(next);
    return true;
  }, [sectionIndex, persistSection]);

  const goPrev = useCallback(() => {
    if (sectionIndex <= 0) return false;
    const prev = ADSET_SECTIONS[sectionIndex - 1]!;
    setSection(prev);
    persistSection(prev);
    return true;
  }, [sectionIndex, persistSection]);

  const validateCurrent = useCallback(
    () => validateAdSetSection(payload, section),
    [payload, section]
  );

  const value = useMemo(
    (): SubflowContextValue => ({
      section,
      sectionIndex,
      isFirst: sectionIndex === 0,
      isLast: sectionIndex === ADSET_SECTIONS.length - 1,
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

export function useAdSetStepSubflow() {
  const ctx = useContext(SubflowContext);
  if (!ctx) throw new Error("useAdSetStepSubflow requires AdSetStepSubflowProvider");
  return ctx;
}

export function useAdSetStepSubflowOptional() {
  return useContext(SubflowContext);
}
