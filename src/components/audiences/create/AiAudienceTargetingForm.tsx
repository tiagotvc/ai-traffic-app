"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { AudienceTargetingSuggestion } from "@/lib/audience-targeting-shared";

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
  onSaved?: (result: { name: string; metaAudienceId?: string }) => void;
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
  const [audienceMode, setAudienceMode] = useState<"include" | "exclude">("include");
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
    setBusinessDescription("");
    setTargetProfile("");
    setBehaviors("");
    setLifestyleHints("");
    setIncludeIds([]);
    setExcludeIds([]);
  }

  function generate() {
    setError(null);
    setSuggestion(null);
    startTransition(async () => {
      const res = await fetch("/api/ai/audience-targeting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
      const j = await res.json();
      if (!j.ok) {
        reportError(j.error ?? t("aiAudienceSaveFailed"));
        return;
      }
      onSaved?.({ name: suggestion.name, metaAudienceId: j.savedAudienceId });
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
            <span className="text-[10px] text-amber-600">({t("aiProviderOff")})</span>
          ) : null}
        </label>
      </div>

      {showDemographics ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("ageMin")}</label>
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
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("ageMax")}</label>
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
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("gender")}</label>
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
              <option value="all">{t("genderAll")}</option>
              <option value="female">{t("genderFemale")}</option>
              <option value="male">{t("genderMale")}</option>
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

      {audiences.length > 0 ? (
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] p-3">
          <p className="text-xs font-medium text-[var(--text-dim)]">{t("aiAudienceIncludeCustom")}</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-dim)]">{t("aiAudienceIncludeCustomHint")}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAudienceMode("include")}
              className={`rounded px-2 py-1 text-[10px] font-medium ${
                audienceMode === "include" ? "bg-[var(--violet)] text-white" : "bg-[var(--surface-bg)]"
              }`}
            >
              {t("aiAudienceModeInclude")}
            </button>
            <button
              type="button"
              onClick={() => setAudienceMode("exclude")}
              className={`rounded px-2 py-1 text-[10px] font-medium ${
                audienceMode === "exclude" ? "bg-slate-700 text-white" : "bg-[var(--surface-bg)]"
              }`}
            >
              {t("aiAudienceModeExclude")}
            </button>
          </div>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {audiencesLoading ? (
              <p className="text-[10px] text-[var(--text-dimmer)]">{t("savedAudiencesLoading")}</p>
            ) : (
              audiences.map((a) => (
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

      <button
        type="button"
        disabled={disabled || pending || !canGenerate}
        onClick={generate}
        className="ui-btn-secondary w-full text-sm"
      >
        {pending ? t("aiAudienceGenerating") : t("aiAudienceGenerate")}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {suggestion ? (
        <div className="space-y-3 rounded-xl border border-[rgba(124,58,237,0.2)] bg-[var(--surface-card)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-main)]">{suggestion.title}</p>
            <p className="mt-1 text-xs text-[var(--text-dim)]">{suggestion.summary}</p>
            <p className="mt-2 text-[10px] text-[var(--text-dimmer)]">
              {t("aiAudienceSavedName")}: <span className="font-medium">{suggestion.name}</span>
            </p>
            <p className="text-[10px] text-[var(--text-dimmer)]">
              {t("aiAudienceModel")}: {suggestion.provider} / {suggestion.modelUsed}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {suggestion.items.map((item) => (
              <span
                key={`${item.type}-${item.id}`}
                className="rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-[10px] text-[var(--violet)]"
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
              className="text-xs text-[var(--text-dim)] underline"
            >
              {t("aiAudienceDiscard")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
