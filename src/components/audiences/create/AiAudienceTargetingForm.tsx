"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type {
  AudiencePersonaPreview,
  AudienceTargetingSuggestion
} from "@/lib/audience-targeting-shared";

type LlmProviderId = "gemini" | "claude";

type AudienceOption = { id: string; name: string };

export type AiAudienceTargetingFormProps = {
  clientSlug: string;
  adAccountId: string;
  audiences: AudienceOption[];
  audiencesLoading?: boolean;
  disabled?: boolean;
  mode?: "save" | "campaign";
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
  }) => void;
  onApproveApply?: (suggestion: AudienceTargetingSuggestion) => Promise<void> | void;
  onError?: (message: string) => void;
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
  onError
}: AiAudienceTargetingFormProps) {
  const t = useTranslations("campaignCreator");
  const [provider, setProvider] = useState<LlmProviderId>("gemini");
  const [providers, setProviders] = useState({ gemini: false, claude: false });
  const [businessDescription, setBusinessDescription] = useState("");
  const [targetProfile, setTargetProfile] = useState("");
  const [behaviors, setBehaviors] = useState("");
  const [lifestyleHints, setLifestyleHints] = useState("");
  const [includeIds, setIncludeIds] = useState<string[]>([]);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<AudienceTargetingSuggestion | null>(null);
  const [personaPreview, setPersonaPreview] = useState<AudiencePersonaPreview | null>(null);
  const [audienceMode, setAudienceMode] = useState<"include" | "exclude" | null>(null);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/audience-targeting")
      .then((r) => r.json())
      .then((j: { providers?: { gemini: boolean; claude: boolean } }) => {
        if (j.providers) {
          setProviders(j.providers);
          if (j.providers.gemini) setProvider("gemini");
          else if (j.providers.claude) setProvider("claude");
        }
      })
      .catch(() => {});
  }, []);

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
    setIncludeIds([]);
    setExcludeIds([]);
    setAudienceMode(null);
    setAudienceSearch("");
  }

  function buildBriefPayload() {
    return {
      clientId: clientSlug,
      adAccountId,
      provider,
      businessDescription: businessDescription.trim(),
      targetProfile: targetProfile.trim(),
      behaviors: behaviors.trim() || undefined,
      lifestyleHints: lifestyleHints.trim() || undefined,
      ageMin,
      ageMax,
      gender,
      countries,
      includeCustomAudienceIds: includeIds,
      excludeCustomAudienceIds: excludeIds
    };
  }

  function generatePersonaPreview() {
    setError(null);
    setSuggestion(null);
    setPersonaPreview(null);
    startTransition(async () => {
      const res = await fetch("/api/ai/audience-targeting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...buildBriefPayload(),
          phase: "persona"
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

  function searchMetaAndBuild() {
    if (!personaPreview) return;
    setError(null);
    setSuggestion(null);
    startTransition(async () => {
      const res = await fetch("/api/ai/audience-targeting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...buildBriefPayload(),
          phase: "targeting",
          persona: personaPreview
        })
      });
      const j = await res.json();
      if (j.ok && j.suggestion) {
        setSuggestion(j.suggestion as AudienceTargetingSuggestion);
      } else {
        reportError(j.error ?? t("aiAudienceFailed"));
      }
    });
  }

  async function approveAndSave() {
    if (!suggestion) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/audience-targeting", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientSlug,
          adAccountId,
          name: suggestion.name,
          targeting: suggestion.targeting,
          provider: suggestion.provider
        })
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        savedAudienceId?: string;
        storage?: "meta" | "local";
        warning?: string;
      };
      if (!j.ok) {
        reportError(j.error ?? t("aiAudienceSaveFailed"));
        return;
      }
      onSaved?.({
        name: suggestion.name,
        metaAudienceId: j.savedAudienceId,
        storage: j.storage,
        warning: j.warning
      });
      resetForm();
    } catch {
      reportError(t("aiAudienceSaveFailed"));
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
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span className="text-[10px] font-medium uppercase text-slate-500">
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

      {showDemographics ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-slate-600">{t("aiDemographicAgeMin")}</label>
            <input
              type="number"
              min={13}
              max={65}
              value={ageMin}
              onChange={(e) =>
                onDemographicsChange?.({ ageMin: Number(e.target.value) || 18 })
              }
              className="ui-input mt-1 w-full text-sm"
              disabled={disabled}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("aiDemographicAgeMax")}</label>
            <input
              type="number"
              min={13}
              max={65}
              value={ageMax}
              onChange={(e) =>
                onDemographicsChange?.({ ageMax: Number(e.target.value) || 65 })
              }
              className="ui-input mt-1 w-full text-sm"
              disabled={disabled}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">{t("aiDemographicGender")}</label>
            <select
              value={gender}
              onChange={(e) =>
                onDemographicsChange?.({
                  gender: e.target.value as "all" | "male" | "female"
                })
              }
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
        <label className="text-xs font-medium text-slate-600">{t("aiAudienceBusiness")}</label>
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
        <label className="text-xs font-medium text-slate-600">{t("aiAudienceProfile")}</label>
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
        <label className="text-xs font-medium text-slate-600">{t("aiAudienceBehaviors")}</label>
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
        <label className="text-xs font-medium text-slate-600">{t("aiAudienceLifestyle")}</label>
        <textarea
          value={lifestyleHints}
          onChange={(e) => setLifestyleHints(e.target.value)}
          rows={2}
          className="ui-textarea mt-1 w-full text-sm"
          placeholder={t("aiAudienceLifestylePh")}
          disabled={disabled}
        />
        <p className="mt-1 text-[10px] text-slate-500">{t("aiAudienceLifestyleHint")}</p>
      </div>

      {audiences.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-medium text-slate-700">{t("aiAudienceIncludeCustom")}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">{t("aiAudienceIncludeCustomHint")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openAudiencePicker("include")}
              className={`rounded px-2 py-1 text-[10px] font-medium ${
                audienceMode === "include" ? "bg-violet-600 text-white" : "bg-slate-100"
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
                audienceMode === "exclude" ? "bg-slate-700 text-white" : "bg-slate-100"
              }`}
            >
              {t("aiAudienceModeExclude")}
              {excludeIds.length > 0 ? (
                <span className="ml-1 rounded-full bg-white/25 px-1.5">{excludeIds.length}</span>
              ) : null}
            </button>
          </div>

          {audienceMode ? (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
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
                  <p className="text-[10px] text-slate-400">{t("savedAudiencesLoading")}</p>
                ) : filteredAudiences.length === 0 ? (
                  <p className="text-[10px] text-slate-400">{t("savedAudiencesNoMatch")}</p>
                ) : (
                  filteredAudiences.map((a) => (
                    <label
                      key={a.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-slate-50"
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
              onClick={searchMetaAndBuild}
              className="ui-btn-primary w-full text-sm"
            >
              {pending ? t("aiAudienceGenerating") : t("aiAudienceSearchMeta")}
            </button>
            <button
              type="button"
              onClick={() => {
                setPersonaPreview(null);
                setSuggestion(null);
              }}
              className="text-xs text-slate-500 underline"
            >
              {t("aiAudienceDiscardPreview")}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {suggestion ? (
        <div className="space-y-3 rounded-xl border border-violet-200 bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{suggestion.title}</p>
            <p className="mt-1 text-xs text-slate-600">{suggestion.summary}</p>
            <p className="mt-2 text-[10px] text-slate-400">
              {t("aiAudienceSavedName")}: <span className="font-medium">{suggestion.name}</span>
            </p>
            <p className="text-[10px] text-slate-400">
              {t("aiAudienceModel")}: {suggestion.provider} / {suggestion.modelUsed}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {suggestion.items.map((item) => (
              <span
                key={`${item.type}-${item.id}`}
                className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-800"
              >
                {item.type === "interest"
                  ? t("aiAudienceChipInterest")
                  : item.type === "behavior"
                    ? t("aiAudienceChipBehavior")
                    : t("aiAudienceChipDemo")}
                : {item.name}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {mode === "campaign" ? (
              <button
                type="button"
                disabled={creating}
                onClick={() => void approveApply()}
                className="ui-btn-primary text-xs"
              >
                {creating ? t("creating") : t("aiAudienceApproveApply")}
              </button>
            ) : null}
            <button
              type="button"
              disabled={creating}
              onClick={() => void approveAndSave()}
              className={mode === "campaign" ? "ui-btn-secondary text-xs" : "ui-btn-primary text-xs"}
            >
              {creating ? t("creating") : t("aiAudienceApproveOnly")}
            </button>
            <button
              type="button"
              onClick={() => setSuggestion(null)}
              className="text-xs text-slate-500 underline"
            >
              {t("aiAudienceDiscard")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
