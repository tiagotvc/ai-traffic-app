"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type {
  AudiencePersonaPreview,
  AudienceTargetingSuggestion
} from "@/lib/audience-targeting-shared";
import {
  canAddMoreSegments,
  removeSegmentFromSuggestion
} from "@/lib/audience-targeting-shared";
import {
  buildRepairBriefFromIssue,
  buildRepairPersonaPreview,
  type PersonaRepairSeed
} from "@/lib/persona-targeting-types";
import { PersonaReplacementHintsPanel } from "@/components/audiences/create/PersonaReplacementHintsPanel";
import { PersonaSegmentChipList } from "@/components/audiences/create/PersonaSegmentChipList";
import { PersonaAddSegmentsModal } from "@/components/audiences/create/PersonaAddSegmentsModal";

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
};

export function AiAudienceTargetingForm({
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
  repairSeed
}: AiAudienceTargetingFormProps) {
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
  const [segmentActionError, setSegmentActionError] = useState<string | null>(null);

  const effectiveAgeMin = isPersonaLibrary ? demoAgeMin : ageMin;
  const effectiveAgeMax = isPersonaLibrary ? demoAgeMax : ageMax;
  const effectiveGender = isPersonaLibrary ? demoGender : gender;
  const isRepairMode = !!repairSeed?.personaId;

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
      return "border border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200";
    }
    return "bg-[rgba(124,58,237,0.1)] text-[var(--violet)]";
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
  }, [apiBase]);

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
  }

  function resolvedSavePersonaName(): string {
    const custom = savePersonaName.trim();
    if (custom) return custom;
    if (repairSeed?.name?.trim()) return repairSeed.name.trim();
    return personaPreview?.personaName?.trim() || suggestion?.title?.trim() || "";
  }

  function buildBriefPayload(avoidSegmentIds: string[] = []) {
    const rejected = repairSeed?.segments.filter((s) => !s.valid) ?? [];
    return {
      clientId: clientSlug,
      adAccountId,
      provider,
      businessDescription: businessDescription.trim(),
      targetProfile: targetProfile.trim(),
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

  const canGenerate =
    businessDescription.trim().length >= 3 &&
    targetProfile.trim().length >= 3 &&
    (provider === "gemini" ? providers.gemini : providers.claude);

  return (
    <div className="space-y-3">
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

      {showDemographics || isPersonaLibrary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("aiDemographicAgeMin")}</label>
            <input
              type="number"
              min={13}
              max={65}
              value={effectiveAgeMin}
              onChange={(e) => {
                const v = Number(e.target.value) || 18;
                if (isPersonaLibrary) setDemoAgeMin(v);
                else onDemographicsChange?.({ ageMin: v });
              }}
              className="ui-input mt-1 w-full text-sm"
              disabled={disabled}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("aiDemographicAgeMax")}</label>
            <input
              type="number"
              min={13}
              max={65}
              value={effectiveAgeMax}
              onChange={(e) => {
                const v = Number(e.target.value) || 65;
                if (isPersonaLibrary) setDemoAgeMax(v);
                else onDemographicsChange?.({ ageMax: v });
              }}
              className="ui-input mt-1 w-full text-sm"
              disabled={disabled}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("aiDemographicGender")}</label>
            <select
              value={effectiveGender}
              onChange={(e) => {
                const v = e.target.value as "all" | "male" | "female";
                if (isPersonaLibrary) setDemoGender(v);
                else onDemographicsChange?.({ gender: v });
              }}
              className="ui-select mt-1 w-full text-sm"
              disabled={disabled}
            >
              <option value="all">{t("aiDemographicGenderAll")}</option>
              <option value="female">{t("aiDemographicGenderFemale")}</option>
              <option value="male">{t("aiDemographicGenderMale")}</option>
            </select>
          </div>
        </div>
      ) : null}

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

      <div>
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

      {audiences.length > 0 ? (
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] p-3">
          <p className="text-xs font-medium text-[var(--text-dim)]">{t("aiAudienceIncludeCustom")}</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">{t("aiAudienceIncludeCustomHint")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openAudiencePicker("include")}
              className={`rounded px-2 py-1 text-[10px] font-medium ${
                audienceMode === "include" ? "bg-[var(--violet)] text-white" : "bg-[var(--surface-bg)]"
              }`}
            >
              {t("aiAudienceModeInclude")}
              {includeIds.length > 0 ? (
                <span className="ml-1 rounded-full bg-white/25 px-1.5">{includeIds.length}</span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => openAudiencePicker("exclude")}
              className={`rounded px-2 py-1 text-[10px] font-medium ${
                audienceMode === "exclude" ? "bg-slate-700 text-white" : "bg-[var(--surface-bg)]"
              }`}
            >
              {t("aiAudienceModeExclude")}
              {excludeIds.length > 0 ? (
                <span className="ml-1 rounded-full bg-white/25 px-1.5">{excludeIds.length}</span>
              ) : null}
            </button>
          </div>
          {audienceMode ? (
            <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3">
              <input
                type="search"
                value={audienceSearch}
                onChange={(e) => setAudienceSearch(e.target.value)}
                placeholder={t("savedAudiencesSearch")}
                className="ui-input w-full text-sm"
                disabled={disabled}
              />
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {audiencesLoading ? (
                  <p className="text-[10px] text-[var(--text-dimmer)]">{t("savedAudiencesLoading")}</p>
                ) : filteredAudiences.length === 0 ? (
                  <p className="text-[10px] text-[var(--text-dimmer)]">{t("savedAudiencesNoMatch")}</p>
                ) : (
                  filteredAudiences.map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-[var(--surface-bg)]"
                    >
                      <input
                        type="checkbox"
                        checked={activeCustomIds.includes(a.id)}
                        onChange={() => toggleCustomAudience(a.id)}
                        disabled={disabled}
                      />
                      <span className="truncate">{a.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!personaPreview ? (
        <button
          type="button"
          disabled={disabled || pending || !canGenerate}
          onClick={generatePersonaPreview}
          className="ui-btn-primary w-full text-sm"
        >
          {pending ? t("aiAudiencePreviewGenerating") : t("aiAudiencePreviewGenerate")}
        </button>
      ) : null}

      {personaPreview && !suggestion ? (
        <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
              {t("aiAudiencePreviewTitle")}
            </p>
            <p className="mt-0.5 text-[10px] text-sky-700">{t("aiAudiencePreviewHint")}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">{personaPreview.personaName}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-700">{personaPreview.narrative}</p>
          </div>

          {personaPreview.traits.length > 0 ? (
            <div>
              <p className="text-[10px] font-medium text-slate-600">{t("aiAudiencePreviewTraits")}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {personaPreview.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-700 ring-1 ring-sky-200"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {personaPreview.lifestyleCorrelates.length > 0 ? (
            <div>
              <p className="text-[10px] font-medium text-slate-600">
                {t("aiAudiencePreviewCorrelates")}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {personaPreview.lifestyleCorrelates.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-900"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-[10px] font-medium text-slate-600">
              {t("aiAudiencePreviewSearchTerms")}
            </p>
            <ul className="mt-1 space-y-1 text-[10px] text-slate-600">
              {personaPreview.searchPlan.interestQueries.length > 0 ? (
                <li>
                  <span className="font-medium">{t("aiAudiencePreviewInterests")}:</span>{" "}
                  {personaPreview.searchPlan.interestQueries.join(" · ")}
                </li>
              ) : null}
              {personaPreview.searchPlan.behaviorQueries.length > 0 ? (
                <li>
                  <span className="font-medium">{t("aiAudiencePreviewBehaviors")}:</span>{" "}
                  {personaPreview.searchPlan.behaviorQueries.join(" · ")}
                </li>
              ) : null}
              {(personaPreview.searchPlan.lifeEventQueries?.length ?? 0) > 0 ? (
                <li>
                  <span className="font-medium">{t("aiAudiencePreviewLifeEvents")}:</span>{" "}
                  {personaPreview.searchPlan.lifeEventQueries!.join(" · ")}
                </li>
              ) : null}
              {personaPreview.searchPlan.demographicQueries.length > 0 ? (
                <li>
                  <span className="font-medium">{t("aiAudiencePreviewDemographics")}:</span>{" "}
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
              className="ui-btn-primary w-full text-sm sm:w-auto sm:flex-1"
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
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {targetingWarning ? (
        <p className="ui-alert-warning text-xs">{targetingWarning}</p>
      ) : null}

      {suggestion ? (
        <div className="space-y-3 rounded-xl border border-[rgba(124,58,237,0.2)] bg-[var(--surface-card)] p-4">
          {isRepairMode ? (
            <div className="ui-alert-warning space-y-1 p-3 text-xs">
              <p className="font-medium text-[var(--text-main)]">{tAud("personaRepairApproveTitle")}</p>
              <p className="text-[var(--text-dim)]">{tAud("personaRepairApproveHint")}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--violet)]">
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
                <label className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
                  {tAud("personaSaveName")}
                </label>
                <input
                  value={savePersonaName}
                  onChange={(e) => setSavePersonaName(e.target.value)}
                  placeholder={personaPreview?.personaName ?? suggestion.title}
                  className="ui-input w-full text-sm"
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

          <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-3">
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
              <span className="mx-2 inline-block h-2 w-2 rounded-full bg-violet-400" />
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
              className={mode === "campaign" ? "ui-btn-secondary text-xs" : "ui-btn-primary text-xs"}
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
        </div>
      ) : null}
    </div>
  );
}
