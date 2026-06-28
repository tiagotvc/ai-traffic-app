"use client";

import { useEffect, useMemo, useState } from "react";
import { Hash, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { PersonaSummary } from "@/components/audiences/PersonasLibraryClient";
import { PersonaAddSegmentsModal } from "@/components/audiences/create/PersonaAddSegmentsModal";
import { PersonaInsightsPanel } from "@/components/audiences/PersonaInsightsPanel";
import { PersonaSegmentChipList } from "@/components/audiences/create/PersonaSegmentChipList";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import {
  canAddMoreSegments,
  extractPersonaTargetingItems,
  removeSegmentFromSuggestion,
  type AudiencePersonaPreview,
  type AudienceTargetingSuggestion,
  type AudienceTargetingSuggestionItem
} from "@/lib/audience-targeting-shared";

type Props = {
  persona: PersonaSummary;
  clientSlug?: string;
  adAccountId?: string;
  allowDelete?: boolean;
  /** Omit title/close row when rendered inside DsModal. */
  embedded?: boolean;
  onClose: () => void;
  onUpdated?: (persona: PersonaSummary) => void;
  onDeleted?: (personaId: string) => void;
};

export function formatPersonaGender(
  gender: string,
  t: ReturnType<typeof useTranslations<"audiences">>
): string {
  if (gender === "male") return t("personaGenderMale");
  if (gender === "female") return t("personaGenderFemale");
  return t("personaGenderAll");
}

function formatUpdatedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function segmentsToSuggestionItems(
  persona: PersonaSummary
): AudienceTargetingSuggestionItem[] {
  return extractPersonaTargetingItems(persona.targeting).map((item) => ({
    type: item.type,
    id: item.id,
    name: item.name
  }));
}

function buildLibraryPersonaPreview(persona: PersonaSummary): AudiencePersonaPreview {
  const narrative = persona.description ?? persona.sourcePrompt ?? persona.name;
  return {
    personaName: persona.name,
    narrative,
    traits: [persona.name],
    lifestyleCorrelates: [],
    searchPlan: {
      interestQueries: [],
      behaviorQueries: [],
      demographicQueries: [],
      lifeEventQueries: []
    },
    suggestedGender:
      persona.gender === "male" || persona.gender === "female" ? persona.gender : "all",
    provider: "gemini",
    modelUsed: "gemini"
  };
}

function suggestionFromPersona(persona: PersonaSummary): AudienceTargetingSuggestion {
  const items = segmentsToSuggestionItems(persona);
  return {
    title: persona.name,
    summary: persona.description ?? persona.name,
    name: persona.name,
    targeting: persona.targeting,
    items,
    includeCustomAudienceIds: [],
    excludeCustomAudienceIds: [],
    provider: "gemini",
    modelUsed: "gemini"
  };
}

export function PersonaDetailPanel({
  persona,
  clientSlug,
  adAccountId,
  allowDelete = true,
  embedded = false,
  onClose,
  onUpdated,
  onDeleted
}: Props) {
  const t = useTranslations("audiences");
  const tCreator = useTranslations("campaignCreator");
  const locale = useLocale();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [addSegmentsOpen, setAddSegmentsOpen] = useState(false);
  const [name, setName] = useState(persona.name);
  const [description, setDescription] = useState(persona.description ?? "");
  const [ageMin, setAgeMin] = useState(persona.ageMin);
  const [ageMax, setAgeMax] = useState(persona.ageMax);
  const [gender, setGender] = useState(persona.gender);
  const [editTargeting, setEditTargeting] = useState(persona.targeting);
  const [editItems, setEditItems] = useState(segmentsToSuggestionItems(persona));

  useEffect(() => {
    setName(persona.name);
    setDescription(persona.description ?? "");
    setAgeMin(persona.ageMin);
    setAgeMax(persona.ageMax);
    setGender(persona.gender);
    setEditTargeting(persona.targeting);
    setEditItems(segmentsToSuggestionItems(persona));
    setSegmentError(null);
  }, [persona]);

  const displayItems = editing ? editItems : segmentsToSuggestionItems(persona);
  const canEditSegments = editing && !!clientSlug && !!adAccountId;

  const genderOptions = useMemo(
    () => [
      { value: "all", label: t("personaGenderAll") },
      { value: "female", label: t("personaGenderFemale") },
      { value: "male", label: t("personaGenderMale") }
    ],
    [t]
  );

  function handleRemoveSegment(itemId: string) {
    if (editItems.length <= 1) {
      setSegmentError(t("personaSegmentMinOne"));
      return;
    }
    setSegmentError(null);
    const next = removeSegmentFromSuggestion(
      { ...suggestionFromPersona({ ...persona, targeting: editTargeting }), items: editItems, targeting: editTargeting },
      itemId
    );
    setEditItems(next.items);
    setEditTargeting(next.targeting);
  }

  function handleAddSegmentsSuccess(next: AudienceTargetingSuggestion) {
    setEditItems(next.items);
    setEditTargeting(next.targeting);
    setSegmentError(null);
  }

  function buildAddSegmentsPayload() {
    const source = persona.sourcePrompt ?? persona.description ?? persona.name;
    return {
      clientId: clientSlug,
      adAccountId,
      provider: "gemini" as const,
      businessDescription: source.slice(0, 500),
      targetProfile: (persona.description ?? persona.name).slice(0, 500),
      ageMin,
      ageMax,
      gender: gender === "male" || gender === "female" ? gender : "all",
      countries: ["BR"],
      includeCustomAudienceIds: [],
      excludeCustomAudienceIds: []
    };
  }

  async function saveEdits() {
    if (!name.trim()) {
      setError(t("personaNameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/personas/${encodeURIComponent(persona.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adAccountId: adAccountId || undefined,
          name: name.trim(),
          description: description.trim() || null,
          ageMin,
          ageMax,
          gender,
          targeting: editing ? editTargeting : undefined
        })
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        persona?: PersonaSummary;
      };
      if (!j.ok || !j.persona) {
        setError(j.error ?? t("personaUpdateFailed"));
        return;
      }
      onUpdated?.(j.persona);
      setEditing(false);
    } catch {
      setError(t("personaUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function deletePersona() {
    if (!window.confirm(t("personaDeleteConfirm", { name: persona.name }))) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/personas/${encodeURIComponent(persona.id)}`, {
        method: "DELETE"
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!j.ok) {
        setError(j.error ?? t("personaDeleteFailed"));
        return;
      }
      onDeleted?.(persona.id);
      onClose();
    } catch {
      setError(t("personaDeleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  const addModalSuggestion = suggestionFromPersona({
    ...persona,
    name: name.trim() || persona.name,
    description: description.trim() || persona.description,
    targeting: editTargeting
  });

  // Fase 2 — editor de segmentos Meta no criador de persona é gateado por flag.
  const [segmentsBuilderEnabled, setSegmentsBuilderEnabled] = useState(true);
  useEffect(() => {
    fetch("/api/audiences/flags")
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setSegmentsBuilderEnabled(j.personaTargetingBuilder !== false);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {embedded ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--text-dimmer)]">
            {t("personaUpdatedAt", {
              date: formatUpdatedAt(persona.updatedAt, locale)
            })}
          </p>
          {!editing ? (
            <button type="button" className="ui-btn-secondary text-sm" onClick={() => setEditing(true)}>
              {t("editPersona")}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ui-input w-full font-heading text-lg"
                placeholder={t("personaSaveName")}
              />
            ) : (
              <h2 className="font-heading text-lg text-[var(--text-main)]">{persona.name}</h2>
            )}
            <p className="mt-1 text-xs text-[var(--text-dimmer)]">
              {t("personaUpdatedAt", {
                date: formatUpdatedAt(persona.updatedAt, locale)
              })}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!editing ? (
              <button type="button" className="ui-btn-secondary text-sm" onClick={() => setEditing(true)}>
                {t("editPersona")}
              </button>
            ) : null}
            <button type="button" className="ui-btn-secondary text-sm" onClick={onClose}>
              {t("close")}
            </button>
          </div>
        </div>
      )}

      {editing ? (
        <div className="space-y-3 rounded-xl border border-[var(--border-color)] p-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-dim)]">{t("personaDescriptionLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="ui-input mt-1 w-full text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FilterTextField
              creatorField
              icon={<Hash size={13} />}
              label={tCreator("aiDemographicAgeMin")}
              value={String(ageMin)}
              onChange={(v) => setAgeMin(Number(v) || 18)}
              type="number"
              min={13}
              max={65}
              selectOnFocus
            />
            <FilterTextField
              creatorField
              icon={<Hash size={13} />}
              label={tCreator("aiDemographicAgeMax")}
              value={String(ageMax)}
              onChange={(v) => setAgeMax(Number(v) || 65)}
              type="number"
              min={13}
              max={65}
              selectOnFocus
            />
            <FilterSelectDropdown
              creatorField
              icon={<Users size={13} />}
              label={tCreator("aiDemographicGender")}
              placeholder={t("personaGenderAll")}
              value={gender}
              onChange={setGender}
              options={genderOptions}
              clearable={false}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-btn-primary text-xs"
              disabled={saving}
              onClick={() => void saveEdits()}
            >
              {saving ? t("savingPersona") : t("savePersonaChanges")}
            </button>
            <button
              type="button"
              className="ui-btn-secondary text-xs"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setName(persona.name);
                setDescription(persona.description ?? "");
                setAgeMin(persona.ageMin);
                setAgeMax(persona.ageMax);
                setGender(persona.gender);
                setEditTargeting(persona.targeting);
                setEditItems(segmentsToSuggestionItems(persona));
                setSegmentError(null);
                setError(null);
              }}
            >
              {t("cancelEdit")}
            </button>
          </div>
        </div>
      ) : persona.description ? (
        <p className="text-sm leading-relaxed text-[var(--text-dim)]">{persona.description}</p>
      ) : null}

      {!editing ? (
        <div className="ui-card space-y-1 p-3 text-sm">
          <p className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
            {t("personaDemographics")}
          </p>
          <p className="text-[var(--text-main)]">
            {persona.ageMin}–{persona.ageMax} · {formatPersonaGender(persona.gender, t)}
          </p>
        </div>
      ) : null}

      {persona.sourcePrompt ? (
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
            {t("personaSourcePrompt")}
          </p>
          <p className="whitespace-pre-wrap rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-3 text-sm text-[var(--text-dim)]">
            {persona.sourcePrompt}
          </p>
        </div>
      ) : null}

      {segmentsBuilderEnabled ? (
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase text-[var(--text-dimmer)]">
          {t("personaTargetingSegments")}
        </p>
        {displayItems.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">{t("personaNoSegments")}</p>
        ) : (
          <PersonaSegmentChipList
            items={displayItems}
            onRemove={canEditSegments ? handleRemoveSegment : undefined}
            readOnly={!canEditSegments}
          />
        )}
        {segmentError ? <p className="text-xs text-red-600">{segmentError}</p> : null}
        {canEditSegments && canAddMoreSegments(editItems) ? (
          <button
            type="button"
            className="ui-btn-secondary text-xs"
            onClick={() => setAddSegmentsOpen(true)}
          >
            {t("addSegments")}
          </button>
        ) : null}
        {canEditSegments && !canAddMoreSegments(editItems) && editItems.length > 0 ? (
          <p className="text-[10px] text-[var(--text-dimmer)]">{t("personaSegmentAtLimit")}</p>
        ) : null}
      </div>
      ) : null}

      <PersonaInsightsPanel
        targeting={persona.targeting}
        ageMin={persona.ageMin}
        ageMax={persona.ageMax}
        gender={persona.gender}
        narrative={persona.description ?? undefined}
        clientSlug={clientSlug}
        adAccountId={adAccountId}
      />

      {canEditSegments ? (
        <PersonaAddSegmentsModal
          open={addSegmentsOpen}
          onClose={() => setAddSegmentsOpen(false)}
          apiBase="/api/personas/ai-generate"
          buildPayload={buildAddSegmentsPayload}
          persona={buildLibraryPersonaPreview({ ...persona, name, description, ageMin, ageMax, gender })}
          suggestion={addModalSuggestion}
          keepItems={editItems}
          onSuccess={handleAddSegmentsSuccess}
          onError={(msg) => setSegmentError(msg)}
        />
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {!editing && allowDelete ? (
        <div className="border-t border-[var(--border-color)] pt-3">
          <button
            type="button"
            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            disabled={deleting}
            onClick={() => void deletePersona()}
          >
            {deleting ? t("deletingPersona") : t("deletePersona")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
