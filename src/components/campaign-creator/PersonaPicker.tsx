"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { PersonaSummary } from "@/components/audiences/PersonasLibraryClient";
import { PersonaDetailPanel } from "@/components/audiences/PersonaDetailPanel";
import { AiPersonaForm } from "@/components/audiences/create/AiPersonaForm";
import type { PersonaTargetingIssue, PersonaTargetingSummary } from "@/lib/persona-targeting-types";
import { PersonaMetaValidationPanel } from "@/components/campaign-creator/PersonaMetaValidationPanel";
import { PersonaTargetingRepairModal } from "@/components/campaign-creator/PersonaTargetingRepairModal";

type Props = {
  value: string | null | undefined;
  clientSlug: string;
  adAccountId: string;
  disabled?: boolean;
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

export function PersonaPicker({ value, clientSlug, adAccountId, disabled, onChange }: Props) {
  const t = useTranslations("campaignCreator");
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [validating, setValidating] = useState(false);
  const [personaIssue, setPersonaIssue] = useState<PersonaTargetingIssue | null>(null);
  const [personaSummary, setPersonaSummary] = useState<PersonaTargetingSummary | null>(null);
  const [repairOpen, setRepairOpen] = useState(false);

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

  return (
    <div className="space-y-2">
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
            className="ui-link-amber text-xs"
            disabled={disabled}
            onClick={() => setShowCreate(true)}
          >
            {t("createPersonaWithAi")}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-dim)]">{t("loading")}</p>
      ) : (
        <select
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] px-3 py-2 text-sm"
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">{t("selectPersonaPlaceholder")}</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {selected?.description ? (
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
            className="ui-link-amber text-xs font-medium"
            onClick={() => setRepairOpen(true)}
          >
            {t("personaTargetingFixNow")}
          </button>
        </div>
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

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="ui-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5">
            <AiPersonaForm
              clientSlug={clientSlug}
              adAccountId={adAccountId}
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
          </div>
        </div>
      ) : null}

      {showEdit && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="ui-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5">
            <PersonaDetailPanel
              persona={selected}
              clientSlug={clientSlug}
              adAccountId={adAccountId}
              allowDelete={false}
              onClose={() => setShowEdit(false)}
              onUpdated={(updated) => {
                handlePersonaUpdated(updated);
                setShowEdit(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
