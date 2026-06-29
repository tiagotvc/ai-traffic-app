"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";
import { Briefcase, Hash, ShieldOff, Sparkles, Target, User, Users, Waves } from "lucide-react";
import { useTranslations } from "next-intl";

import type {
  AudiencePersonaPreview,
  AudienceTargetingSuggestion
} from "@/lib/audience-targeting-shared";
import {
  buildFlexibleSpecFromSegmentItems,
  canAddMoreSegments,
  extractPersonaTargetingItems,
  removeSegmentFromSuggestion,
  type AudienceTargetingSuggestionItem
} from "@/lib/audience-targeting-shared";
import { PersonaManualMetaSegmentsPanel } from "@/components/audiences/create/PersonaManualMetaSegmentsPanel";
import {
  buildRepairBriefFromIssue,
  buildRepairPersonaPreview,
  type PersonaRepairSeed
} from "@/lib/persona-targeting-types";
import {
  personaSectionShowsField,
  personaStepShowsField,
  type PersonaCreatorSectionKey,
  type PersonaCreatorStepKey
} from "@/components/audiences/create/persona-creator-steps";
import { PersonaReplacementHintsPanel } from "@/components/audiences/create/PersonaReplacementHintsPanel";
import { AudienceCreationInsightsPanel } from "@/components/audiences/create/AudienceCreationInsightsPanel";
import { PersonaSegmentChipList } from "@/components/audiences/create/PersonaSegmentChipList";
import { PersonaAddSegmentsModal } from "@/components/audiences/create/PersonaAddSegmentsModal";
import {
  CreatorAiPreviewSection,
  CreatorAiPromptField
} from "@/components/campaign-creator/CreatorAiModalParts";
import { AiCreditCostHint } from "@/components/ui/AiCreditCostHint";
import { FilterSelectDropdown, type FilterSelectOption } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import { DsModal } from "@/design-system/components/DsModal";
import { cn } from "@/lib/cn";
import { usePersonaCreatorScoreOptional } from "@/components/audiences/create/PersonaCreatorScoreContext";
import {
  buildPersonaDraftScoreInput,
  computePersonaDraftScore,
  type PersonaDraftScoreInput
} from "@/lib/persona-draft-score";

type LlmProviderId = "gemini" | "claude";

type AudienceOption = { id: string; name: string };

export type AiAudienceTargetingFormProps = {
  clientSlug: string;
  adAccountId: string;
  audiences: AudienceOption[];
  audiencesLoading?: boolean;
  disabled?: boolean;
  mode?: "save" | "campaign" | "persona_library";
  ageMin?: number;
  ageMax?: number;
  gender?: "all" | "male" | "female";
  countries?: string[];
  showDemographics?: boolean;
  onDemographicsChange?: (patch: {
    ageMin?: number;
    ageMax?: number;
    gender?: "all" | "male" | "female";
  }) => void;
  onSaved?: (result: {
    name: string;
    metaAudienceId?: string;
    storage?: "meta" | "local";
    warning?: string;
    personaId?: string;
  }) => void;
  onApproveApply?: (suggestion: AudienceTargetingSuggestion) => Promise<void> | void;
  onError?: (message: string) => void;
  repairSeed?: PersonaRepairSeed;
  /** When true, credits/footer actions live in CreatorAiModalShell. */
  shellMode?: boolean;
  /** When set, only the matching persona creator section fields are shown. */
  personaSection?: PersonaCreatorSectionKey;
  /** From-scratch persona — same briefing fields as AI, without Motor de IA / credits. */
  manualMode?: boolean;
  /** @deprecated Prefer personaSection */
  personaStep?: PersonaCreatorStepKey;
  onActionStateChange?: (state: AiAudienceTargetingFormActionState) => void;
};

export type AiAudienceTargetingFormActionState = {
  canSave: boolean;
  canClear: boolean;
  pending: boolean;
  creating: boolean;
  /** Live field snapshot for persona creator sidebar score. */
  personaScoreInput?: PersonaDraftScoreInput;
  /** Precomputed sidebar score (0–100) when mode is persona_library. */
  personaDraftScore?: number;
};

export type AiAudienceTargetingFormHandle = {
  reset: () => void;
  save: () => void;
};

export const AiAudienceTargetingForm = forwardRef<AiAudienceTargetingFormHandle, AiAudienceTargetingFormProps>(
function AiAudienceTargetingForm({
  clientSlug,
  adAccountId,
  audiences,
  audiencesLoading,
  disabled,
  mode = "save",
  ageMin = 18,
  ageMax = 65,
  gender = "all",
  countries = ["BR"],
  showDemographics = false,
  onDemographicsChange,
  onSaved,
  onApproveApply,
  onError,
  repairSeed,
  shellMode = false,
  manualMode = false,
  personaSection,
  personaStep,
  onActionStateChange
}: AiAudienceTargetingFormProps, ref) {
  const t = useTranslations("campaignCreator");
  const tAud = useTranslations("audiences");
  const isPersonaLibrary = mode === "persona_library";
  const apiBase = isPersonaLibrary ? "/api/personas/ai-generate" : "/api/ai/audience-targeting";
  const [provider, setProvider] = useState<LlmProviderId>("gemini");
  const [providers, setProviders] = useState({ gemini: false, claude: false });
  const [businessDescription, setBusinessDescription] = useState("");
  const [targetProfile, setTargetProfile] = useState("");
  const [behaviors, setBehaviors] = useState("");
  const [lifestyleHints, setLifestyleHints] = useState("");
  const [exclusionHints, setExclusionHints] = useState("");
  const [includeIds, setIncludeIds] = useState<string[]>([]);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<AudienceTargetingSuggestion | null>(null);
  const [personaPreview, setPersonaPreview] = useState<AudiencePersonaPreview | null>(null);
  const [audienceMode, setAudienceMode] = useState<"include" | "exclude" | null>(null);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetingWarning, setTargetingWarning] = useState<string | null>(null);
  const [demoAgeMin, setDemoAgeMin] = useState(ageMin);
  const [demoAgeMax, setDemoAgeMax] = useState(ageMax);
  const [demoGender, setDemoGender] = useState(gender);
  const [savePersonaName, setSavePersonaName] = useState("");
  const [addSegmentsOpen, setAddSegmentsOpen] = useState(false);
  const [customAudiencesOpen, setCustomAudiencesOpen] = useState(false);
  const [segmentActionError, setSegmentActionError] = useState<string | null>(null);
  const [manualSegments, setManualSegments] = useState<AudienceTargetingSuggestionItem[]>([]);
  // Flags do módulo de públicos (persona): editor de segmentos × insights.
  const [audienceFlags, setAudienceFlags] = useState({
    personaInsights: true,
    personaTargetingBuilder: true,
    marketingScientist: true
  });
  useEffect(() => {
    fetch("/api/audiences/flags")
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) {
          setAudienceFlags({
            personaInsights: j.personaInsights !== false,
            personaTargetingBuilder: j.personaTargetingBuilder !== false,
            marketingScientist: j.marketingScientist !== false
          });
        }
      })
      .catch(() => {});
  }, []);
  const personaCreatorScore = usePersonaCreatorScoreOptional();
  const setPersonaCreatorScoreInput = personaCreatorScore?.setScoreInput;
  const onActionStateChangeRef = useRef(onActionStateChange);

  useEffect(() => {
    onActionStateChangeRef.current = onActionStateChange;
  }, [onActionStateChange]);

  const effectiveAgeMin = isPersonaLibrary ? demoAgeMin : ageMin;
  const effectiveAgeMax = isPersonaLibrary ? demoAgeMax : ageMax;
  const effectiveGender = isPersonaLibrary ? demoGender : gender;
  const isRepairMode = !!repairSeed?.personaId;

  // Targeting usado nos Insights & Comparação (gerado pela IA ou montado dos segmentos manuais).
  const insightsTargeting: Record<string, unknown> | null =
    (suggestion?.targeting as Record<string, unknown> | undefined) ??
    (manualSegments.length
      ? {
          flexible_spec: [
            {
              interests: manualSegments
                .filter((s) => s.type === "interest")
                .map((s) => ({ id: s.id, name: s.name })),
              behaviors: manualSegments
                .filter((s) => s.type === "behavior")
                .map((s) => ({ id: s.id, name: s.name }))
            }
          ],
          age_min: effectiveAgeMin,
          age_max: effectiveAgeMax,
          ...(effectiveGender === "male"
            ? { genders: [1] }
            : effectiveGender === "female"
              ? { genders: [2] }
              : {})
        }
      : null);

  // Comparação automática (Orion Brain): roda em background quando há público + cliente,
  // a flag está ligada e o usuário NÃO pausou. O resultado vai pro contexto (card Orion Brain).
  const insightsBriefText = [businessDescription, targetProfile, behaviors, lifestyleHints]
    .filter(Boolean)
    .join("\n")
    .trim();
  const insightsReady =
    isPersonaLibrary &&
    Boolean(clientSlug) &&
    Boolean(adAccountId) &&
    (Boolean(insightsTargeting) || (Boolean(businessDescription.trim()) && Boolean(targetProfile.trim())));
  const insightsSignature = insightsReady
    ? JSON.stringify({
        ids: insightsTargeting
          ? extractPersonaTargetingItems(insightsTargeting)
              .map((i) => i.id)
              .sort()
          : [],
        brief: insightsBriefText.slice(0, 400),
        effectiveAgeMin,
        effectiveAgeMax,
        effectiveGender,
        clientSlug,
        adAccountId
      })
    : null;
  const setInsightsResult = personaCreatorScore?.setInsightsResult;
  const setInsightsLoading = personaCreatorScore?.setInsightsLoading;
  const brainPaused = personaCreatorScore?.paused ?? false;

  // Leva o cliente da persona ao contexto (alimenta a pipeline de pesquisa unificada).
  const setClientSlugCtx = personaCreatorScore?.setClientSlug;
  useEffect(() => {
    if (isPersonaLibrary) setClientSlugCtx?.(clientSlug || null);
  }, [isPersonaLibrary, clientSlug, setClientSlugCtx]);

  useEffect(() => {
    if (!setInsightsResult || !setInsightsLoading) return;
    if (
      !insightsSignature ||
      !audienceFlags.personaInsights ||
      !audienceFlags.marketingScientist ||
      brainPaused
    )
      return;
    let active = true;
    const handle = setTimeout(() => {
      setInsightsLoading(true);
      fetch("/api/personas/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientSlug,
          adAccountId,
          targeting: insightsTargeting ?? {},
          ageMin: effectiveAgeMin,
          ageMax: effectiveAgeMax,
          gender: effectiveGender,
          narrative: personaPreview?.narrative || insightsBriefText || undefined
        })
      })
        .then((r) => r.json())
        .then((j) => {
          if (active && j?.ok) setInsightsResult(j);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setInsightsLoading(false);
        });
    }, 1200);
    return () => {
      active = false;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightsSignature, audienceFlags.personaInsights, audienceFlags.marketingScientist, brainPaused]);

  const keptValidSegmentIds = new Set(
    repairSeed?.segments.filter((s) => s.valid).map((s) => s.id) ?? []
  );
  const replacementAlternativeIds = new Set([
    ...(suggestion?.replacementHints?.flatMap((h) => h.alternatives.map((a) => a.id)) ?? []),
    ...(repairSeed?.metaReplacements
      ?.map((r) => r.replacement?.id)
      .filter((id): id is string => !!id) ?? [])
  ]);

  function segmentChipClass(item: { id: string }) {
    if (repairSeed?.rejectedSegmentIds.includes(item.id)) {
      return "border border-red-300 bg-red-50 text-red-800 line-through";
    }
    if (isRepairMode && replacementAlternativeIds.has(item.id)) {
      return "border border-emerald-300 bg-emerald-50 font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
    }
    if (isRepairMode && !keptValidSegmentIds.has(item.id)) {
      return "border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] font-semibold text-[var(--ui-accent)]";
    }
    return "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]";
  }

  useEffect(() => {
    if (!repairSeed) return;
    const parsed = buildRepairBriefFromIssue({
      sourcePrompt: repairSeed.sourcePrompt,
      description: repairSeed.description,
      personaName: repairSeed.name
    });
    setBusinessDescription(parsed.businessDescription);
    setTargetProfile(parsed.targetProfile);
    setBehaviors(parsed.behaviors);
    setLifestyleHints(parsed.lifestyleHints);
    setDemoAgeMin(repairSeed.ageMin);
    setDemoAgeMax(repairSeed.ageMax);
    setDemoGender(repairSeed.gender);
    setPersonaPreview(buildRepairPersonaPreview(repairSeed));
  }, [repairSeed]);

  useEffect(() => {
    if (manualMode) return;
    fetch(apiBase)
      .then((r) => r.json())
      .then((j: { providers?: { gemini: boolean; claude: boolean } }) => {
        if (j.providers) {
          setProviders(j.providers);
          if (j.providers.gemini) setProvider("gemini");
          else if (j.providers.claude) setProvider("claude");
        }
      })
      .catch(() => {});
  }, [apiBase, manualMode]);

  const activeCustomIds = audienceMode === "include" ? includeIds : excludeIds;
  const audienceSearchNorm = audienceSearch.trim().toLowerCase();
  const filteredAudiences = audienceSearchNorm
    ? audiences.filter((a) => a.name.toLowerCase().includes(audienceSearchNorm))
    : audiences;

  function openAudiencePicker(mode: "include" | "exclude") {
    setAudienceMode((prev) => {
      if (prev === mode) return mode;
      setAudienceSearch("");
      return mode;
    });
  }

  function toggleCustomAudience(id: string) {
    if (audienceMode === "include") {
      setIncludeIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      setExcludeIds((prev) => prev.filter((x) => x !== id));
    } else {
      setExcludeIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      setIncludeIds((prev) => prev.filter((x) => x !== id));
    }
  }

  function formatRemovedSegmentsWarning(
    segments: Array<{ id: string; name?: string }>
  ): string {
    const names = segments
      .map((s) => s.name || s.id)
      .slice(0, 4)
      .join(", ");
    const suffix = segments.length > 4 ? ` (+${segments.length - 4})` : "";
    return tAud("personaTargetingRemovedWarning", {
      count: segments.length,
      names: `${names}${suffix}`
    });
  }

  function reportError(message: string) {
    setError(message);
    onError?.(message);
  }

  function resetForm() {
    setSuggestion(null);
    setPersonaPreview(null);
    setBusinessDescription("");
    setTargetProfile("");
    setBehaviors("");
    setLifestyleHints("");
    setExclusionHints("");
    setIncludeIds([]);
    setExcludeIds([]);
    setAudienceMode(null);
    setAudienceSearch("");
    setTargetingWarning(null);
    setSavePersonaName("");
    setManualSegments([]);
  }

  function buildManualPersonaDescription(): string {
    return [
      businessDescription.trim(),
      targetProfile.trim(),
      behaviors.trim(),
      lifestyleHints.trim(),
      exclusionHints.trim()
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  function buildManualPersonaTargeting(): Record<string, unknown> {
    const genders =
      effectiveGender === "male" ? [1] : effectiveGender === "female" ? [2] : undefined;
    const targeting: Record<string, unknown> = {
      age_min: effectiveAgeMin,
      age_max: effectiveAgeMax
    };
    if (genders) targeting.genders = genders;
    const flexible = buildFlexibleSpecFromSegmentItems(manualSegments);
    if (flexible.length) targeting.flexible_spec = flexible;
    if (includeIds.length) {
      targeting.custom_audiences = includeIds.map((id) => ({ id }));
    }
    if (excludeIds.length) {
      targeting.excluded_custom_audiences = excludeIds.map((id) => ({ id }));
    }
    return targeting;
  }

  function resolvedManualPersonaName(): string {
    const custom = savePersonaName.trim();
    if (custom) return custom;
    return targetProfile.trim().slice(0, 120) || businessDescription.trim().slice(0, 80);
  }

  async function saveManualPersona() {
    const name = resolvedManualPersonaName();
    if (!name) {
      reportError(tAud("personaNameRequired"));
      return;
    }
    if (businessDescription.trim().length < 3 || resolvedTargetProfile().length < 3) {
      reportError(t("aiAudienceBriefTooShort"));
      return;
    }
    if (!clientSlug || !adAccountId) {
      reportError(tAud("personaNeedsAdAccount"));
      return;
    }
    const description = buildManualPersonaDescription();
    const targeting = buildManualPersonaTargeting();
    setCreating(true);
    setError(null);
    try {
      const valid = await validateSuggestionTargeting(targeting);
      if (!valid) return;
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adAccountId,
          name,
          description,
          ageMin: effectiveAgeMin,
          ageMax: effectiveAgeMax,
          gender: effectiveGender,
          targeting,
          sourcePrompt: description
        })
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        persona?: { id: string; name: string };
      };
      if (!j.ok) {
        reportError(j.error ?? tAud("savePersonaFailed"));
        return;
      }
      onSaved?.({ name, personaId: j.persona?.id });
      resetForm();
    } catch {
      reportError(tAud("savePersonaFailed"));
    } finally {
      setCreating(false);
    }
  }

  function resolvedSavePersonaName(): string {
    const custom = savePersonaName.trim();
    if (custom) return custom;
    if (repairSeed?.name?.trim()) return repairSeed.name.trim();
    return personaPreview?.personaName?.trim() || suggestion?.title?.trim() || "";
  }

  function resolvedTargetProfile(): string {
    return targetProfile.trim();
  }

  function buildBriefPayload(avoidSegmentIds: string[] = []) {
    const rejected = repairSeed?.segments.filter((s) => !s.valid) ?? [];
    const base = {
      clientId: clientSlug,
      adAccountId,
      businessDescription: businessDescription.trim(),
      targetProfile: resolvedTargetProfile(),
      behaviors: behaviors.trim() || undefined,
      lifestyleHints: lifestyleHints.trim() || undefined,
      exclusionHints: exclusionHints.trim() || undefined,
      ageMin: effectiveAgeMin,
      ageMax: effectiveAgeMax,
      gender: effectiveGender,
      countries,
      includeCustomAudienceIds: isPersonaLibrary ? [] : includeIds,
      excludeCustomAudienceIds: isPersonaLibrary ? [] : excludeIds,
      rejectedSegmentIds: rejected.map((s) => s.id),
      rejectedSegments: rejected.map((s) => ({ id: s.id, name: s.name, type: s.type })),
      avoidSegmentIds
    };
    return isPersonaLibrary ? base : { ...base, provider };
  }

  function buildPersonaBriefPayload(avoidSegmentIds: string[] = []) {
    return {
      ...buildBriefPayload(avoidSegmentIds),
      includeCustomAudienceIds: includeIds,
      excludeCustomAudienceIds: excludeIds
    };
  }

  function refineBriefing() {
    setPersonaPreview(null);
    setSuggestion(null);
    setTargetingWarning(null);
    setError(null);
  }

  function handleRemoveSegment(itemId: string) {
    if (!suggestion) return;
    if (suggestion.items.length <= 1) {
      setSegmentActionError(tAud("personaSegmentMinOne"));
      return;
    }
    setSegmentActionError(null);
    setSuggestion(removeSegmentFromSuggestion(suggestion, itemId));
  }

  function handleAddSegmentsSuccess(next: AudienceTargetingSuggestion) {
    setSuggestion(next);
    setTargetingWarning(
      next.removedSegments?.length ? formatRemovedSegmentsWarning(next.removedSegments) : null
    );
    setSegmentActionError(null);
  }

  function generatePersonaPreview() {
    setError(null);
    setSuggestion(null);
    setPersonaPreview(null);
    startTransition(async () => {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(isPersonaLibrary ? buildPersonaBriefPayload() : buildBriefPayload()),
          phase: isPersonaLibrary ? "preview" : "persona"
        })
      });
      const j = await res.json();
      if (j.ok && j.persona) {
        setPersonaPreview(j.persona as AudiencePersonaPreview);
      } else {
        reportError(j.error ?? t("aiAudiencePreviewFailed"));
      }
    });
  }

  function searchMetaAndBuild(options?: { retry?: boolean }) {
    if (!personaPreview) return;
    const avoidSegmentIds =
      options?.retry && suggestion ? suggestion.items.map((item) => item.id) : [];
    setError(null);
    setSuggestion(null);
    setTargetingWarning(null);
    startTransition(async () => {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(isPersonaLibrary
            ? buildPersonaBriefPayload(avoidSegmentIds)
            : buildBriefPayload(avoidSegmentIds)),
          phase: "targeting",
          persona: personaPreview
        })
      });
      const j = await res.json();
      if (j.ok && j.suggestion) {
        const next = j.suggestion as AudienceTargetingSuggestion;
        setSuggestion(next);
        setTargetingWarning(
          next.removedSegments?.length
            ? formatRemovedSegmentsWarning(next.removedSegments)
            : null
        );
      } else {
        reportError(j.error ?? t("aiAudienceFailed"));
      }
    });
  }

  async function validateSuggestionTargeting(
    targeting: Record<string, unknown>
  ): Promise<boolean> {
    const res = await fetch("/api/personas/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        adAccountId,
        targeting
      })
    });
    const j = (await res.json()) as { ok?: boolean; valid?: boolean; error?: string };
    if (!j.ok || j.valid === false) {
      reportError(j.error ?? tAud("personaTargetingSaveBlocked"));
      return false;
    }
    return true;
  }

  async function approveAndSave() {
    if (!suggestion) return;
    if (isPersonaLibrary && (!clientSlug || !adAccountId)) {
      reportError(tAud("personaNeedsAdAccount"));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const valid = await validateSuggestionTargeting(suggestion.targeting);
      if (!valid) return;

      const personaNameForSave = resolvedSavePersonaName();
      if (isPersonaLibrary && !personaNameForSave) {
        reportError(tAud("personaNameRequired"));
        return;
      }

      const isRepair = !!repairSeed?.personaId;
      const res = await fetch(apiBase, {
        method: isPersonaLibrary ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isPersonaLibrary
            ? {
                ...buildPersonaBriefPayload(),
                phase: isRepair ? "repair" : "build",
                ...(isRepair ? { personaId: repairSeed.personaId } : {}),
                persona: personaPreview,
                suggestion: {
                  title: suggestion.title,
                  summary: suggestion.summary,
                  name: personaNameForSave,
                  targeting: suggestion.targeting
                }
              }
            : {
                clientId: clientSlug,
                adAccountId,
                name: suggestion.name,
                targeting: suggestion.targeting,
                provider: suggestion.provider
              }
        )
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        savedAudienceId?: string;
        storage?: "meta" | "local";
        warning?: string;
        removedSegments?: Array<{ id: string; name?: string }>;
        persona?: { id: string; name: string };
      };
      if (!j.ok) {
        reportError(j.error ?? (isPersonaLibrary ? tAud("savePersonaFailed") : t("aiAudienceSaveFailed")));
        return;
      }
      const removedWarning = j.removedSegments?.length
        ? formatRemovedSegmentsWarning(j.removedSegments)
        : undefined;
      onSaved?.({
        name: isPersonaLibrary ? personaNameForSave : suggestion.name,
        metaAudienceId: j.savedAudienceId,
        storage: j.storage,
        warning: removedWarning ?? j.warning,
        personaId: j.persona?.id ?? repairSeed?.personaId
      });
      resetForm();
    } catch {
      reportError(isPersonaLibrary ? tAud("savePersonaFailed") : t("aiAudienceSaveFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function approveApply() {
    if (!suggestion || !onApproveApply) return;
    setCreating(true);
    setError(null);
    try {
      await onApproveApply(suggestion);
      resetForm();
    } catch {
      reportError(t("aiAudienceSaveFailed"));
    } finally {
      setCreating(false);
    }
  }

  const aiAvailable = providers.gemini || providers.claude;
  const canGenerate =
    businessDescription.trim().length >= 3 &&
    resolvedTargetProfile().length >= 3 &&
    (isPersonaLibrary ? aiAvailable : provider === "gemini" ? providers.gemini : providers.claude);

  const canSave = manualMode
    ? businessDescription.trim().length >= 3 &&
      resolvedTargetProfile().length >= 3 &&
      !!resolvedManualPersonaName() &&
      !creating &&
      !pending
    : !!suggestion &&
      !creating &&
      !pending &&
      (!isPersonaLibrary || !!resolvedSavePersonaName());

  useImperativeHandle(ref, () => ({
    reset: resetForm,
    save: () => void (manualMode ? saveManualPersona() : approveAndSave())
  }));

  const personaScoreInput = useMemo(
    () =>
      isPersonaLibrary
        ? buildPersonaDraftScoreInput({
            manualMode,
            businessDescription,
            targetProfile,
            behaviors,
            lifestyleHints,
            exclusionHints,
            savePersonaName,
            suggestion,
            personaPreview,
            manualSegmentCount: manualSegments.length,
            ageMin: effectiveAgeMin,
            ageMax: effectiveAgeMax,
            gender: effectiveGender
          })
        : undefined,
    [
      isPersonaLibrary,
      manualMode,
      businessDescription,
      targetProfile,
      behaviors,
      lifestyleHints,
      exclusionHints,
      savePersonaName,
      suggestion,
      personaPreview,
      manualSegments.length,
      effectiveAgeMin,
      effectiveAgeMax,
      effectiveGender
    ]
  );

  const personaDraftScore = useMemo(
    () => (personaScoreInput ? computePersonaDraftScore(personaScoreInput) : 0),
    [personaScoreInput]
  );

  useEffect(() => {
    if (!setPersonaCreatorScoreInput || !personaScoreInput) return;
    setPersonaCreatorScoreInput(personaScoreInput);
  }, [personaScoreInput, setPersonaCreatorScoreInput]);

  useEffect(() => {
    onActionStateChangeRef.current?.({
      canSave,
      canClear: Boolean(
        businessDescription ||
          targetProfile ||
          behaviors ||
          lifestyleHints ||
          exclusionHints ||
          savePersonaName ||
          personaPreview ||
          suggestion ||
          manualSegments.length
      ),
      pending,
      creating,
      personaScoreInput,
      personaDraftScore: isPersonaLibrary ? personaDraftScore : undefined
    });
  }, [
    canSave,
    businessDescription,
    targetProfile,
    behaviors,
    lifestyleHints,
    exclusionHints,
    savePersonaName,
    personaPreview,
    suggestion,
    manualSegments.length,
    pending,
    creating,
    personaScoreInput,
    personaDraftScore,
    isPersonaLibrary
  ]);

  const usePersonaShellFields = isPersonaLibrary;
  const show = (field: Parameters<typeof personaSectionShowsField>[1]) => {
    if (personaSection) {
      return personaSectionShowsField(personaSection, field, { manual: manualMode });
    }
    if (personaStep) {
      return personaStepShowsField(personaStep, field);
    }
    return true;
  };

  const genderOptions = useMemo(
    (): FilterSelectOption[] => [
      { value: "all", label: t("aiDemographicGenderAll") },
      { value: "female", label: t("aiDemographicGenderFemale") },
      { value: "male", label: t("aiDemographicGenderMale") }
    ],
    [t]
  );

  return (
    <div className="space-y-4">
      {isPersonaLibrary && !shellMode && !manualMode ? (
        <AiCreditCostHint kind="audience_suggestions" calls={2} className="w-full justify-center" />
      ) : null}

      {!manualMode && !usePersonaShellFields ? (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-2">
            <span className="text-[10px] font-medium uppercase text-[var(--text-dim)]">
              {t("aiProviderLabel")}
            </span>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                name="ai-provider-form"
                checked={provider === "gemini"}
                onChange={() => setProvider("gemini")}
                disabled={disabled || !providers.gemini}
              />
              Gemini
              {!providers.gemini ? (
                <span className="text-[10px] text-amber-600">({t("aiProviderOff")})</span>
              ) : null}
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="radio"
                name="ai-provider-form"
                checked={provider === "claude"}
                onChange={() => setProvider("claude")}
                disabled={disabled || !providers.claude}
              />
              Claude
              {!providers.claude ? (
                <span
                  className="text-[10px] text-amber-600"
                  title={t("aiProviderClaudeHint")}
                >
                  ({t("aiProviderOff")})
                </span>
              ) : null}
            </label>
          </div>

          {!providers.claude ? (
            <p className="text-[10px] leading-snug text-amber-700">{t("aiProviderClaudeHint")}</p>
          ) : null}
        </>
      ) : null}

      {repairSeed && repairSeed.segments.some((s) => !s.valid) ? (
        <div className="ui-alert-warning space-y-2 p-3 text-xs">
          <p className="font-medium">{tAud("personaRepairRejectedTitle")}</p>
          <div className="flex flex-wrap gap-1">
            {repairSeed.segments
              .filter((s) => !s.valid)
              .map((seg) => (
                <span
                  key={seg.id}
                  className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-800 line-through"
                >
                  {seg.name}
                </span>
              ))}
          </div>
          <p className="text-[var(--text-dim)]">{tAud("personaRepairRejectedHint")}</p>
          {repairSeed.metaReplacements?.length ? (
            <PersonaReplacementHintsPanel metaReplacements={repairSeed.metaReplacements} />
          ) : null}
        </div>
      ) : null}

      {(showDemographics || isPersonaLibrary) && show("demographics") ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FilterTextField
            creatorField
            icon={<Hash size={13} />}
            label={t("aiDemographicAgeMin")}
            value={String(effectiveAgeMin)}
            onChange={(v) => {
              const next = Number(v) || 18;
              if (isPersonaLibrary) setDemoAgeMin(next);
              else onDemographicsChange?.({ ageMin: next });
            }}
            type="number"
            min={13}
            max={65}
            selectOnFocus
            disabled={disabled}
          />
          <FilterTextField
            creatorField
            icon={<Hash size={13} />}
            label={t("aiDemographicAgeMax")}
            value={String(effectiveAgeMax)}
            onChange={(v) => {
              const next = Number(v) || 65;
              if (isPersonaLibrary) setDemoAgeMax(next);
              else onDemographicsChange?.({ ageMax: next });
            }}
            type="number"
            min={13}
            max={65}
            selectOnFocus
            disabled={disabled}
          />
          <FilterSelectDropdown
            creatorField
            icon={<Users size={13} />}
            label={t("aiDemographicGender")}
            placeholder={t("aiDemographicGenderAll")}
            value={effectiveGender}
            onChange={(v) => {
              const next = v as "all" | "male" | "female";
              if (isPersonaLibrary) setDemoGender(next);
              else onDemographicsChange?.({ gender: next });
            }}
            options={genderOptions}
            clearable={false}
            disabled={disabled}
          />
        </div>
      ) : null}

      {(show("business") ||
        show("profile") ||
        show("behaviors") ||
        show("lifestyle") ||
        show("exclusions")) && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {usePersonaShellFields ? (
          <>
            {show("business") ? (
            <CreatorAiPromptField
              icon={<Briefcase size={14} />}
              label={t("aiAudienceBusiness")}
              value={businessDescription}
              onChange={setBusinessDescription}
              placeholder={t("aiAudienceBusinessPh")}
              disabled={disabled}
            />
            ) : null}
            {show("profile") ? (
            <CreatorAiPromptField
              icon={<User size={14} />}
              label={t("aiAudienceProfile")}
              value={targetProfile}
              onChange={setTargetProfile}
              placeholder={t("aiAudienceProfilePh")}
              disabled={disabled}
            />
            ) : null}
            {show("behaviors") ? (
            <CreatorAiPromptField
              icon={<Target size={14} />}
              label={t("aiAudienceBehaviors")}
              value={behaviors}
              onChange={setBehaviors}
              placeholder={t("aiAudienceBehaviorsPh")}
              disabled={disabled}
            />
            ) : null}
            {show("lifestyle") ? (
            <CreatorAiPromptField
              icon={<Waves size={14} />}
              label={t("aiAudienceLifestyle")}
              value={lifestyleHints}
              onChange={setLifestyleHints}
              placeholder={t("aiAudienceLifestylePh")}
              hint={t("aiAudienceLifestyleHint")}
              disabled={disabled}
            />
            ) : null}
            {show("exclusions") ? (
            <div className="sm:col-span-2">
              <CreatorAiPromptField
                icon={<ShieldOff size={14} />}
                label={t("aiAudienceExclusions")}
                value={exclusionHints}
                onChange={setExclusionHints}
                placeholder={t("aiAudienceExclusionsPh")}
                hint={t("aiAudienceExclusionsHint")}
                disabled={disabled}
              />
            </div>
            ) : null}
          </>
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-[var(--text-dim)]">{t("aiAudienceBusiness")}</label>
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                rows={2}
                className="ui-textarea mt-1 w-full text-sm"
                placeholder={t("aiAudienceBusinessPh")}
                disabled={disabled}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-dim)]">{t("aiAudienceProfile")}</label>
              <textarea
                value={targetProfile}
                onChange={(e) => setTargetProfile(e.target.value)}
                rows={2}
                className="ui-textarea mt-1 w-full text-sm"
                placeholder={t("aiAudienceProfilePh")}
                disabled={disabled}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-dim)]">{t("aiAudienceBehaviors")}</label>
              <textarea
                value={behaviors}
                onChange={(e) => setBehaviors(e.target.value)}
                rows={2}
                className="ui-textarea mt-1 w-full text-sm"
                placeholder={t("aiAudienceBehaviorsPh")}
                disabled={disabled}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-dim)]">{t("aiAudienceLifestyle")}</label>
              <textarea
                value={lifestyleHints}
                onChange={(e) => setLifestyleHints(e.target.value)}
                rows={2}
                className="ui-textarea mt-1 w-full text-sm"
                placeholder={t("aiAudienceLifestylePh")}
                disabled={disabled}
              />
              <p className="mt-1 text-[10px] text-[var(--text-dim)]">{t("aiAudienceLifestyleHint")}</p>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-dim)]">{t("aiAudienceExclusions")}</label>
              <textarea
                value={exclusionHints}
                onChange={(e) => setExclusionHints(e.target.value)}
                rows={2}
                className="ui-textarea mt-1 w-full text-sm"
                placeholder={t("aiAudienceExclusionsPh")}
                disabled={disabled}
              />
              <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">{t("aiAudienceExclusionsHint")}</p>
            </div>
          </>
        )}
      </div>
      )}

      {/* Segmentos Meta: NÃO aparecem no Criador de Persona (vivem no Criador de Públicos Meta).
          Mantidos para outros modos (ex.: targeting de campanha) quando o admin habilita a flag. */}
      {manualMode && show("metaSegments") && !isPersonaLibrary && audienceFlags.personaTargetingBuilder ? (
        <PersonaManualMetaSegmentsPanel
          segments={manualSegments}
          onChange={setManualSegments}
          disabled={disabled || creating}
        />
      ) : null}


      {show("objectives") ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setAudienceMode("include");
              setCustomAudiencesOpen(true);
            }}
            className="ui-btn-secondary-accent px-3 py-1.5 text-xs"
          >
            {t("aiAudienceIncludeCustom")}
          </button>
          {includeIds.length > 0 || excludeIds.length > 0 ? (
            <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--ui-accent)]">
              +{includeIds.length} / −{excludeIds.length}
            </span>
          ) : null}
          <DsModal
            open={customAudiencesOpen}
            onClose={() => setCustomAudiencesOpen(false)}
            title={t("aiAudienceIncludeCustom")}
            subtitle={t("aiAudienceIncludeCustomHint")}
            width="md"
            footer={
              <button
                type="button"
                className="ui-btn-accent px-4 py-2 text-sm font-heading font-semibold"
                onClick={() => setCustomAudiencesOpen(false)}
              >
                {tAud("close")}
              </button>
            }
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openAudiencePicker("include")}
                  className={cn(
                    "rounded-lg px-2 py-1 text-[10px] font-medium",
                    audienceMode === "include"
                      ? "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)]"
                      : "bg-[var(--surface-bg)] text-[var(--text-dim)] ring-1 ring-[var(--border-color)]"
                  )}
                >
                  {t("aiAudienceModeInclude")}
                  {includeIds.length > 0 ? (
                    <span className="ml-1 rounded-full bg-white/25 px-1.5">{includeIds.length}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => openAudiencePicker("exclude")}
                  className={cn(
                    "rounded-lg px-2 py-1 text-[10px] font-medium",
                    audienceMode === "exclude"
                      ? "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)]"
                      : "bg-[var(--surface-bg)] text-[var(--text-dim)] ring-1 ring-[var(--border-color)]"
                  )}
                >
                  {t("aiAudienceModeExclude")}
                  {excludeIds.length > 0 ? (
                    <span className="ml-1 rounded-full bg-white/25 px-1.5">{excludeIds.length}</span>
                  ) : null}
                </button>
              </div>
              {audienceMode ? (
                <div className="space-y-2">
                  <input
                    type="search"
                    value={audienceSearch}
                    onChange={(e) => setAudienceSearch(e.target.value)}
                    placeholder={t("savedAudiencesSearch")}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[var(--ui-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-accent-ring)]",
                      usePersonaShellFields
                        ? "border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))]"
                        : "ui-input"
                    )}
                    disabled={disabled}
                  />
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {audiencesLoading ? (
                      <p className="text-[10px] text-[var(--text-dimmer)]">{t("savedAudiencesLoading")}</p>
                    ) : filteredAudiences.length === 0 ? (
                      <p className="text-[10px] text-[var(--text-dimmer)]">{t("savedAudiencesNoMatch")}</p>
                    ) : (
                      filteredAudiences.map((a) => (
                        <label
                          key={a.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-[var(--row-hover)]"
                        >
                          <input
                            type="checkbox"
                            checked={activeCustomIds.includes(a.id)}
                            onChange={() => toggleCustomAudience(a.id)}
                            disabled={disabled}
                            className="accent-[var(--ui-accent)]"
                          />
                          <span className="truncate">{a.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-[var(--text-dimmer)]">{t("aiAudienceIncludeCustomHint")}</p>
              )}
            </div>
          </DsModal>
        </div>
      ) : null}

      {show("preview") && !manualMode && !personaPreview ? (
        usePersonaShellFields ? (
          <CreatorAiPreviewSection
            title={t("aiAudiencePreviewTitle")}
            hint={t("aiAudiencePreviewHint")}
            action={
              <button
                type="button"
                disabled={disabled || pending || !canGenerate}
                onClick={generatePersonaPreview}
                className="ui-btn-accent inline-flex w-full items-center justify-center gap-1.5 text-sm font-heading font-semibold sm:w-auto"
              >
                <Sparkles size={14} aria-hidden />
                {pending ? t("aiAudiencePreviewGenerating") : t("aiAudiencePreviewGenerate")}
              </button>
            }
          />
        ) : (
          <button
            type="button"
            disabled={disabled || pending || !canGenerate}
            onClick={generatePersonaPreview}
            className="ui-btn-primary w-full text-sm"
          >
            {pending ? t("aiAudiencePreviewGenerating") : t("aiAudiencePreviewGenerate")}
          </button>
        )
      ) : null}

      {show("preview") && !manualMode && personaPreview && !suggestion ? (
        <CreatorAiPreviewSection
          title={t("aiAudiencePreviewTitle")}
          hint={t("aiAudiencePreviewHint")}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--text-main)]">{personaPreview.personaName}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">{personaPreview.narrative}</p>
          </div>

          {usePersonaShellFields ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FilterTextField
                creatorField
                readOnly
                icon={<Hash size={13} />}
                label={t("aiDemographicAgeMin")}
                value={String(effectiveAgeMin)}
                onChange={() => {}}
              />
              <FilterTextField
                creatorField
                readOnly
                icon={<Hash size={13} />}
                label={t("aiDemographicAgeMax")}
                value={String(effectiveAgeMax)}
                onChange={() => {}}
              />
              <FilterTextField
                creatorField
                readOnly
                icon={<Users size={13} />}
                label={t("aiDemographicGender")}
                value={genderOptions.find((o) => o.value === effectiveGender)?.label ?? effectiveGender}
                onChange={() => {}}
              />
            </div>
          ) : null}

          {personaPreview.traits.length > 0 ? (
            <div>
              <p className="text-[10px] font-medium text-[var(--text-dimmer)]">{t("aiAudiencePreviewTraits")}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {personaPreview.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-2 py-0.5 text-[10px] text-[var(--text-main)] ring-1 ring-[var(--creator-card-border,var(--border-color))]"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {personaPreview.lifestyleCorrelates.length > 0 ? (
            <div>
              <p className="text-[10px] font-medium text-[var(--text-dimmer)]">
                {t("aiAudiencePreviewCorrelates")}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {personaPreview.lifestyleCorrelates.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] text-[var(--ui-accent)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-[10px] font-medium text-[var(--text-dimmer)]">
              {t("aiAudiencePreviewSearchTerms")}
            </p>
            <ul className="mt-1 space-y-1 text-[10px] text-[var(--text-dim)]">
              {personaPreview.searchPlan.interestQueries.length > 0 ? (
                <li>
                  <span className="font-medium text-[var(--text-main)]">{t("aiAudiencePreviewInterests")}:</span>{" "}
                  {personaPreview.searchPlan.interestQueries.join(" · ")}
                </li>
              ) : null}
              {personaPreview.searchPlan.behaviorQueries.length > 0 ? (
                <li>
                  <span className="font-medium text-[var(--text-main)]">{t("aiAudiencePreviewBehaviors")}:</span>{" "}
                  {personaPreview.searchPlan.behaviorQueries.join(" · ")}
                </li>
              ) : null}
              {(personaPreview.searchPlan.lifeEventQueries?.length ?? 0) > 0 ? (
                <li>
                  <span className="font-medium text-[var(--text-main)]">{t("aiAudiencePreviewLifeEvents")}:</span>{" "}
                  {personaPreview.searchPlan.lifeEventQueries!.join(" · ")}
                </li>
              ) : null}
              {personaPreview.searchPlan.demographicQueries.length > 0 ? (
                <li>
                  <span className="font-medium text-[var(--text-main)]">{t("aiAudiencePreviewDemographics")}:</span>{" "}
                  {personaPreview.searchPlan.demographicQueries.join(" · ")}
                </li>
              ) : null}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={disabled || pending}
              onClick={() => searchMetaAndBuild()}
              className="ui-btn-accent inline-flex w-full items-center justify-center gap-1.5 text-sm font-heading font-semibold sm:w-auto sm:flex-1"
            >
              {pending ? t("aiAudienceGenerating") : t("aiAudienceSearchMeta")}
            </button>
            <button
              type="button"
              disabled={disabled || pending}
              onClick={refineBriefing}
              className="ui-btn-secondary w-full text-sm sm:w-auto"
            >
              {t("aiAudienceRefineBriefing")}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-dimmer)]">{t("aiAudiencePreviewActionsHint")}</p>
        </CreatorAiPreviewSection>
      ) : null}

      {show("preview") && manualMode ? (
        <CreatorAiPreviewSection
          title={t("aiAudiencePreviewTitle")}
          hint={tAud("personaManualPreviewHint")}
        >
          <div className="space-y-1">
            <FilterTextField
              creatorField
              icon={<User size={13} />}
              label={tAud("personaSaveName")}
              value={savePersonaName}
              onChange={setSavePersonaName}
              placeholder={resolvedManualPersonaName() || tAud("personaManualNamePh")}
              disabled={disabled || creating}
            />
            <p className="text-[10px] text-[var(--text-dimmer)]">{tAud("personaManualSaveNameHint")}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FilterTextField
              creatorField
              readOnly
              icon={<Hash size={13} />}
              label={t("aiDemographicAgeMin")}
              value={String(effectiveAgeMin)}
              onChange={() => {}}
            />
            <FilterTextField
              creatorField
              readOnly
              icon={<Hash size={13} />}
              label={t("aiDemographicAgeMax")}
              value={String(effectiveAgeMax)}
              onChange={() => {}}
            />
            <FilterTextField
              creatorField
              readOnly
              icon={<Users size={13} />}
              label={t("aiDemographicGender")}
              value={genderOptions.find((o) => o.value === effectiveGender)?.label ?? effectiveGender}
              onChange={() => {}}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-3">
            {businessDescription.trim() ? (
              <div>
                <p className="text-[10px] font-medium text-[var(--text-dimmer)]">{t("aiAudienceBusiness")}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-main)]">{businessDescription.trim()}</p>
              </div>
            ) : null}
            {resolvedTargetProfile() ? (
              <div>
                <p className="text-[10px] font-medium text-[var(--text-dimmer)]">{t("aiAudienceProfile")}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-main)]">{resolvedTargetProfile()}</p>
              </div>
            ) : null}
            {behaviors.trim() ? (
              <div>
                <p className="text-[10px] font-medium text-[var(--text-dimmer)]">{t("aiAudienceBehaviors")}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-main)]">{behaviors.trim()}</p>
              </div>
            ) : null}
            {lifestyleHints.trim() ? (
              <div>
                <p className="text-[10px] font-medium text-[var(--text-dimmer)]">{t("aiAudienceLifestyle")}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-main)]">{lifestyleHints.trim()}</p>
              </div>
            ) : null}
            {exclusionHints.trim() ? (
              <div>
                <p className="text-[10px] font-medium text-[var(--text-dimmer)]">{t("aiAudienceExclusions")}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-main)]">{exclusionHints.trim()}</p>
              </div>
            ) : null}
            {(includeIds.length > 0 || excludeIds.length > 0) ? (
              <div>
                <p className="text-[10px] font-medium text-[var(--text-dimmer)]">{t("aiAudienceIncludeCustom")}</p>
                <p className="mt-0.5 text-xs text-[var(--text-main)]">
                  +{includeIds.length} / −{excludeIds.length}
                </p>
              </div>
            ) : null}
            {manualSegments.length > 0 ? (
              <div>
                <p className="text-[10px] font-medium text-[var(--text-dimmer)]">
                  {t("aiAudienceSegmentsTitle")}
                </p>
                <div className="mt-2">
                  <PersonaSegmentChipList
                    items={manualSegments}
                    readOnly
                    segmentChipClass={() =>
                      "rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] text-[var(--ui-accent)]"
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>

          {!canSave && !creating ? (
            <p className="text-[10px] text-[var(--text-dimmer)]">{t("aiAudienceBriefTooShort")}</p>
          ) : null}
        </CreatorAiPreviewSection>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {targetingWarning ? (
        <p className="ui-alert-warning text-xs">{targetingWarning}</p>
      ) : null}

      {show("preview") && !manualMode && (personaPreview || suggestion) ? (
        <AudienceCreationInsightsPanel
          ageMin={effectiveAgeMin}
          ageMax={effectiveAgeMax}
          gender={effectiveGender}
          segmentCount={suggestion?.items.length ?? 0}
          validSegmentCount={suggestion?.items.length}
          aiInsightSummary={suggestion?.summary ?? null}
        />
      ) : null}

      {show("preview") && !manualMode && suggestion ? (
        <section className="campaign-creator-card space-y-3">
          {isRepairMode ? (
            <div className="ui-alert-warning space-y-1 p-3 text-xs">
              <p className="font-medium text-[var(--text-main)]">{tAud("personaRepairApproveTitle")}</p>
              <p className="text-[var(--text-dim)]">{tAud("personaRepairApproveHint")}</p>
            </div>
          ) : (
            <div>
              <p className="campaign-creator-orion-section-label text-[var(--ui-accent)]">
                {t("aiAudienceSegmentsTitle")}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">{t("aiAudienceSegmentsHint")}</p>
            </div>
          )}

          {suggestion.replacementHints?.length ? (
            <PersonaReplacementHintsPanel apiHints={suggestion.replacementHints} />
          ) : null}

          <div>
            <p className="text-sm font-semibold text-[var(--text-main)]">{suggestion.title}</p>
            <p className="mt-1 text-xs text-[var(--text-dim)]">{suggestion.summary}</p>
            {isPersonaLibrary ? (
              <div className="mt-3 space-y-1">
                <FilterTextField
                  creatorField
                  icon={<User size={13} />}
                  label={tAud("personaSaveName")}
                  value={savePersonaName}
                  onChange={setSavePersonaName}
                  placeholder={personaPreview?.personaName ?? suggestion.title}
                  disabled={creating || pending}
                />
                <p className="text-[10px] text-[var(--text-dimmer)]">{tAud("personaSaveNameHint")}</p>
              </div>
            ) : (
              <p className="mt-2 text-[10px] text-[var(--text-dimmer)]">
                {t("aiAudienceSavedName")}:{" "}
                <span className="font-medium">{suggestion.name}</span>
              </p>
            )}
            <p className="mt-2 text-[10px] text-[var(--text-dimmer)]">
              {t("aiAudienceModel")}: {suggestion.provider} / {suggestion.modelUsed}
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-3">
            <PersonaSegmentChipList
              items={suggestion.items}
              onRemove={handleRemoveSegment}
              segmentChipClass={(item) => segmentChipClass(item)}
              replacementAlternativeIds={replacementAlternativeIds}
              isRepairMode={isRepairMode}
            />
            {segmentActionError ? (
              <p className="text-[10px] text-red-600">{segmentActionError}</p>
            ) : null}
            {canAddMoreSegments(suggestion.items) ? (
              <button
                type="button"
                disabled={creating || pending}
                onClick={() => setAddSegmentsOpen(true)}
                className="ui-btn-secondary text-xs"
              >
                {tAud("addSegments")}
              </button>
            ) : (
              <p className="text-[10px] text-[var(--text-dimmer)]">{tAud("personaSegmentAtLimit")}</p>
            )}
          </div>

          {personaPreview ? (
            <PersonaAddSegmentsModal
              open={addSegmentsOpen}
              onClose={() => setAddSegmentsOpen(false)}
              apiBase={apiBase}
              buildPayload={() =>
                isPersonaLibrary ? buildPersonaBriefPayload() : buildBriefPayload()
              }
              persona={personaPreview}
              suggestion={suggestion}
              keepItems={suggestion.items}
              onSuccess={handleAddSegmentsSuccess}
              onError={reportError}
            />
          ) : null}

          {isRepairMode ? (
            <p className="text-[10px] text-[var(--text-dimmer)]">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {tAud("personaRepairLegendReplacement")}
              <span className="mx-2 inline-block h-2 w-2 rounded-full bg-[var(--ui-accent)]" />
              {tAud("personaRepairLegendNew")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {mode === "campaign" ? (
              <button
                type="button"
                disabled={creating || pending}
                onClick={() => void approveApply()}
                className="ui-btn-primary text-xs"
              >
                {creating ? t("creating") : t("aiAudienceApproveApply")}
              </button>
            ) : null}
            <button
              type="button"
              disabled={creating || pending || (isPersonaLibrary && !resolvedSavePersonaName())}
              onClick={() => void approveAndSave()}
              className={
                shellMode && isPersonaLibrary
                  ? "hidden"
                  : mode === "campaign"
                    ? "ui-btn-secondary text-xs"
                    : "ui-btn-primary text-xs"
              }
            >
              {creating
                ? t("creating")
                : isRepairMode
                  ? tAud("personaRepairApproveSave")
                  : isPersonaLibrary
                    ? tAud("savePersona")
                    : t("aiAudienceApproveSegments")}
            </button>
            <button
              type="button"
              disabled={creating || pending}
              onClick={() => searchMetaAndBuild({ retry: true })}
              className="ui-btn-secondary text-xs"
            >
              {pending ? t("aiAudienceGenerating") : t("aiAudienceSearchAgain")}
            </button>
            <button
              type="button"
              disabled={creating || pending}
              onClick={refineBriefing}
              className="ui-btn-secondary text-xs"
            >
              {t("aiAudienceRefineBriefing")}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-dimmer)]">{t("aiAudienceSegmentsActionsHint")}</p>
        </section>
      ) : null}
    </div>
  );
});
