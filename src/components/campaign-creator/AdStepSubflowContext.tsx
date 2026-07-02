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
import {
  adExistingPostRef,
  adUsesExistingPost,
  getActiveAd,
  getActiveAdset,
  objectiveAllowsExistingPost,
  patchWizardNavigation,
  usesReusedMetaCreative,
  type CampaignDraftPayload
} from "@/lib/campaign-draft";
import { validateAdCreativeForMeta } from "@/lib/meta-ad-creative";

export const AD_SECTIONS = ["setup", "creative", "destination"] as const;
export type AdSection = (typeof AD_SECTIONS)[number];

function normalizeAdSection(raw: string | undefined): AdSection {
  if (raw === "identity") return "setup";
  if (raw && (AD_SECTIONS as readonly string[]).includes(raw)) return raw as AdSection;
  return "setup";
}

function initialVisitedThrough(rawSection: string | undefined): number {
  const normalized = normalizeAdSection(rawSection);
  let idx = AD_SECTIONS.indexOf(normalized);
  if (rawSection === "identity") idx = Math.max(idx, 0);
  if (rawSection === "creative") idx = Math.max(idx, 1);
  if (rawSection === "destination") idx = Math.max(idx, 2);
  return Math.max(0, idx);
}

export function validateAdSection(
  payload: CampaignDraftPayload,
  section: AdSection
): string | null {
  const ad = getActiveAd(payload);
  const adset = getActiveAdset(payload);

  switch (section) {
    case "setup":
      if (!ad.pageId.trim()) return "pageRequired";
      if (!ad.name.trim()) return "adNameRequired";
      return null;
    case "creative":
      if (adUsesExistingPost(ad)) {
        // The post carries its own media/copy — only the reference is required.
        if (!adExistingPostRef(ad)) return "existingPostRequired";
        if (!objectiveAllowsExistingPost(payload.objective)) return "existingPostObjectiveIncompatible";
        return null;
      }
      if (usesReusedMetaCreative(ad)) {
        if (!ad.metaCreativeId?.trim()) return "metaCreativeRequired";
      } else {
        const creativeErr = validateAdCreativeForMeta(ad);
        if (creativeErr) return creativeErr;
      }
      return null;
    case "destination":
      // Existing-post creatives keep the post's own link, CTA and copy.
      if (adUsesExistingPost(ad)) return null;
      if (payload.objective === "leads" && ad.destinationType === "instant_form") {
        if (!ad.leadFormId) return "leadFormRequired";
      } else if (ad.destinationType === "whatsapp" || ad.destinationType === "instant_form") {
        /* ok */
      } else if (!ad.linkUrl.trim()) {
        return "linkUrlRequired";
      }
      if (adset?.conversionLocation === "messaging" && !ad.messageTemplate?.greeting?.trim()) {
        return "messageTemplateRequired";
      }
      return null;
  }
}

type SubflowContextValue = {
  section: AdSection;
  sectionIndex: number;
  isFirst: boolean;
  isLast: boolean;
  canGoTo: (section: AdSection) => boolean;
  isSectionVisited: (section: AdSection) => boolean;
  goTo: (section: AdSection) => void;
  goNext: () => boolean;
  goPrev: () => boolean;
  validateCurrent: () => string | null;
};

const SubflowContext = createContext<SubflowContextValue | null>(null);

export function AdStepSubflowProvider({ children }: { children: ReactNode }) {
  const { activeNode, payload, updatePayload } = useCampaignDraft();
  const savedSection = payload.meta?.wizardNavigation?.adSection;
  const [section, setSection] = useState<AdSection>(() => normalizeAdSection(savedSection));
  const [visitedThrough, setVisitedThrough] = useState(() => initialVisitedThrough(savedSection));
  const prevActiveNode = useRef(activeNode);

  const persistSection = useCallback(
    (next: AdSection) => {
      updatePayload((p) => patchWizardNavigation(p, { adSection: next }));
    },
    [updatePayload]
  );

  useEffect(() => {
    if (activeNode === "ad" && prevActiveNode.current !== "ad") {
      const restored = normalizeAdSection(payload.meta?.wizardNavigation?.adSection);
      setSection(restored);
      setVisitedThrough(initialVisitedThrough(payload.meta?.wizardNavigation?.adSection));
    }
    prevActiveNode.current = activeNode;
  }, [activeNode, payload.meta?.wizardNavigation?.adSection]);

  const sectionIndex = AD_SECTIONS.indexOf(section);

  const canGoTo = useCallback(
    (target: AdSection) => {
      if (activeNode !== "ad") return false;
      const idx = AD_SECTIONS.indexOf(target);
      return idx <= visitedThrough || idx === sectionIndex;
    },
    [activeNode, sectionIndex, visitedThrough]
  );

  const isSectionVisited = useCallback(
    (target: AdSection) => {
      const idx = AD_SECTIONS.indexOf(target);
      return idx <= visitedThrough;
    },
    [visitedThrough]
  );

  const goTo = useCallback(
    (target: AdSection) => {
      if (!canGoTo(target)) return;
      setSection(target);
      persistSection(target);
    },
    [canGoTo, persistSection]
  );

  const goNext = useCallback(() => {
    if (sectionIndex >= AD_SECTIONS.length - 1) return false;
    const next = AD_SECTIONS[sectionIndex + 1]!;
    setVisitedThrough((v) => Math.max(v, sectionIndex + 1));
    setSection(next);
    persistSection(next);
    return true;
  }, [sectionIndex, persistSection]);

  const goPrev = useCallback(() => {
    if (sectionIndex <= 0) return false;
    const prev = AD_SECTIONS[sectionIndex - 1]!;
    setSection(prev);
    persistSection(prev);
    return true;
  }, [sectionIndex, persistSection]);

  const validateCurrent = useCallback(
    () => validateAdSection(payload, section),
    [payload, section]
  );

  const value = useMemo(
    (): SubflowContextValue => ({
      section,
      sectionIndex,
      isFirst: sectionIndex === 0,
      isLast: sectionIndex === AD_SECTIONS.length - 1,
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

export function useAdStepSubflow() {
  const ctx = useContext(SubflowContext);
  if (!ctx) throw new Error("useAdStepSubflow requires AdStepSubflowProvider");
  return ctx;
}

export function useAdStepSubflowOptional() {
  return useContext(SubflowContext);
}
