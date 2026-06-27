"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import type { PersonaSummary } from "@/components/audiences/PersonasLibraryClient";
import { formatPersonaGender, PersonaDetailPanel } from "@/components/audiences/PersonaDetailPanel";
import { AiPersonaForm } from "@/components/audiences/create/AiPersonaForm";
import type {
  AiAudienceTargetingFormActionState,
  AiAudienceTargetingFormHandle
} from "@/components/audiences/create/AiAudienceTargetingForm";
import { FormSelect } from "@/components/ui/FormSelect";
import type { PersonaTargetingIssue, PersonaTargetingSummary } from "@/lib/persona-targeting-types";
import { formatPersonaCardSummary } from "@/lib/adset-display-summary";
import { PersonaMetaValidationPanel } from "@/components/campaign-creator/PersonaMetaValidationPanel";
import { PersonaTargetingRepairModal } from "@/components/campaign-creator/PersonaTargetingRepairModal";
import { CreatorAiModalShell, CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";

type Props = {
  value: string | null | undefined;
  clientSlug: string;
  adAccountId: string;
  disabled?: boolean;
  variant?: "default" | "adset";
  hideTitle?: boolean;
  onChange: (personaId: string | null) => void;
};

function revalidatePersona(
  adAccountId: string,
  personaId: string
): Promise<{ issue: PersonaTargetingIssue | null; summary: PersonaTargetingSummary | null }> {
  return fetch("/api/personas/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ adAccountId, personaIds: [personaId], findReplacements: true })
  })
    .then((r) => r.json())
    .then((j: { issues?: PersonaTargetingIssue[]; summaries?: PersonaTargetingSummary[] }) => ({
      issue: j.issues?.[0] ?? null,
      summary: j.summaries?.find((s) => s.personaId === personaId) ?? null
    }))
    .catch(() => ({ issue: null, summary: null }));
}

export function PersonaPicker({
  value,
  clientSlug,
  adAccountId,
  disabled,
  variant = "default",
  hideTitle,
  onChange
}: Props) {
  const t = useTranslations("campaignCreator");
  const tAud = useTranslations("audiences");
  const isAdset = variant === "adset";
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [validating, setValidating] = useState(false);
  const [personaIssue, setPersonaIssue] = useState<PersonaTargetingIssue | null>(null);
  const [personaSummary, setPersonaSummary] = useState<PersonaTargetingSummary | null>(null);
  const [repairOpen, setRepairOpen] = useState(false);
  const personaFormRef = useRef<AiAudienceTargetingFormHandle>(null);
  const [personaFormState, setPersonaFormState] = useState<AiAudienceTargetingFormActionState>({
    canSave: false,
    canClear: false,
    pending: false,
    creating: false
  });

  function loadPersonas() {
    setLoading(true);
    fetch("/api/personas")
      .then((r) => r.json())
      .then((j: { ok?: boolean; personas?: PersonaSummary[] }) => {
        setPersonas(j.personas ?? []);
      })
      .catch(() => setPersonas([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPersonas();
  }, [showCreate, showEdit]);

  useEffect(() => {
    if (!value || !adAccountId) {
      setPersonaIssue(null);
      setPersonaSummary(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setValidating(true);
      revalidatePersona(adAccountId, value)
        .then(({ issue, summary }) => {
          if (cancelled) return;
          setPersonaIssue(issue);
          setPersonaSummary(summary);
        })
        .finally(() => {
          if (!cancelled) setValidating(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, adAccountId]);

  const selected = personas.find((p) => p.id === value);

  function handlePersonaUpdated(updated: PersonaSummary) {
    setPersonas((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (adAccountId) {
      void revalidatePersona(adAccountId, updated.id).then(({ issue, summary }) => {
        setPersonaIssue(issue);
        setPersonaSummary(summary);
      });
    }
  }

  const selectedCardSummary =
    selected &&
    formatPersonaCardSummary(
      selected,
      formatPersonaGender(selected.gender, tAud),
      t("personaCardInterests")
    );

  return (
    <div className="space-y-2">
      {!isAdset ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-[var(--text-main)]">{t("selectPersona")}</span>
          <div className="flex shrink-0 items-center gap-2">
            {selected ? (
              <button
                type="button"
                className="ui-link text-xs"
                disabled={disabled}
                onClick={() => setShowEdit(true)}
              >
                {t("editPersona")}
              </button>
            ) : null}
            <button
              type="button"
              className="ui-btn-secondary-accent inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium"
              disabled={disabled}
              onClick={() => setShowCreate(true)}
            >
              <Sparkles size={11} />
              {t("createPersonaWithAi")}
            </button>
          </div>
        </div>
      ) : hideTitle ? null : (
        <span className="text-xs font-semibold text-[var(--text-main)]">{t("personaColumnLabel")}</span>
      )}

      {loading ? (
        <p className="text-xs text-[var(--text-dim)]">{t("loading")}</p>
      ) : personas.length > 0 ? (
        <FormSelect
          value={value ?? ""}
          onChange={(id) => onChange(id || null)}
          placeholder={t("selectPersonaPlaceholder")}
          disabled={disabled}
          options={personas.map((p) => ({ value: p.id, label: p.name }))}
        />
      ) : null}

      {selected && isAdset ? (
        <div className="campaign-creator-adset-picker-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-main)]">{selected.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-dim)]">
                {selectedCardSummary}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 rounded-md p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--surface-card)] hover:text-[var(--ui-accent)]"
              disabled={disabled}
              onClick={() => setShowEdit(true)}
              aria-label={t("editPersona")}
              title={t("editPersona")}
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {!isAdset && selected?.description ? (
        <p className="text-xs text-[var(--text-dim)]">{selected.description}</p>
      ) : null}

      {validating ? (
        <p className="text-[10px] text-[var(--text-dimmer)]">{t("personaTargetingValidating")}</p>
      ) : null}

      {!validating && personaSummary ? (
        <PersonaMetaValidationPanel
          summary={personaSummary}
          onFix={!personaSummary.valid ? () => setRepairOpen(true) : undefined}
        />
      ) : personaIssue && !validating ? (
        <div className="ui-alert-warning space-y-2 p-3 text-xs">
          <p>{t("personaTargetingSelectWarning")}</p>
          <button
            type="button"
            className="ui-link text-xs font-medium"
            onClick={() => setRepairOpen(true)}
          >
            {t("personaTargetingFixNow")}
          </button>
        </div>
      ) : null}

      {isAdset ? (
        <button
          type="button"
          className="ui-btn-secondary-accent inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium"
          disabled={disabled}
          onClick={() => setShowCreate(true)}
        >
          <Sparkles size={13} />
          {t("createPersonaWithAi")}
        </button>
      ) : null}

      <PersonaTargetingRepairModal
        open={repairOpen}
        issues={personaIssue ? [personaIssue] : []}
        clientSlug={clientSlug}
        adAccountId={adAccountId}
        onClose={() => setRepairOpen(false)}
        onResolved={() => {
          setRepairOpen(false);
          if (value) {
            void revalidatePersona(adAccountId, value).then(({ issue, summary }) => {
              setPersonaIssue(issue);
              setPersonaSummary(summary);
            });
          }
        }}
        onPersonaReplaced={(_oldId, newId) => onChange(newId)}
      />

      <CreatorAiModalShell
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={tAud("newPersona")}
        subtitle={t("createPersonaWithAiHint")}
        titleIcon={<Sparkles size={16} />}
        width="xl"
        aiCredits={{ kind: "audience_suggestions", calls: 2 }}
        onClear={() => personaFormRef.current?.reset()}
        clearDisabled={!personaFormState.canClear || personaFormState.pending || personaFormState.creating}
        onCancel={() => setShowCreate(false)}
        onPrimary={() => personaFormRef.current?.save()}
        primaryLabel={tAud("savePersona")}
        primaryDisabled={!personaFormState.canSave}
        primaryLoading={personaFormState.creating}
      >
        <AiPersonaForm
          ref={personaFormRef}
          embedded
          shellMode
          clientSlug={clientSlug}
          adAccountId={adAccountId}
          onActionStateChange={setPersonaFormState}
          onClose={() => setShowCreate(false)}
          onSaved={(personaId) => {
            setShowCreate(false);
            fetch("/api/personas")
              .then((r) => r.json())
              .then((j: { personas?: PersonaSummary[] }) => {
                const list = j.personas ?? [];
                setPersonas(list);
                if (personaId) onChange(personaId);
                else if (list[0]) onChange(list[0].id);
              });
          }}
        />
      </CreatorAiModalShell>

      {selected ? (
        <CreatorModalShell
          open={showEdit}
          onClose={() => setShowEdit(false)}
          title={selected.name}
          width="xl"
          hideFooter
        >
          <PersonaDetailPanel
            persona={selected}
            clientSlug={clientSlug}
            adAccountId={adAccountId}
            allowDelete={false}
            embedded
            onClose={() => setShowEdit(false)}
            onUpdated={(updated) => {
              handlePersonaUpdated(updated);
              setShowEdit(false);
            }}
          />
        </CreatorModalShell>
      ) : null}
    </div>
  );
}
