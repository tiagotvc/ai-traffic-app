"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AiPersonaForm } from "@/components/audiences/create/AiPersonaForm";
import { PersonaSegmentAuditPanel } from "@/components/campaign-creator/PersonaSegmentAuditPanel";
import type { PersonaRepairSeed, PersonaTargetingIssue } from "@/lib/persona-targeting-types";
import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";
import { UxWizardModalPanel } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

export type { PersonaTargetingIssue } from "@/lib/persona-targeting-types";

type Props = {
  open: boolean;
  loading?: boolean;
  issues: PersonaTargetingIssue[];
  clientSlug: string;
  adAccountId: string;
  onClose: () => void;
  onResolved: (options?: { retryPublish?: boolean }) => void;
  onPersonaReplaced?: (oldId: string, newId: string) => void;
};

export function PersonaTargetingRepairModal({
  open,
  loading = false,
  issues,
  clientSlug,
  adAccountId,
  onClose,
  onResolved,
  onPersonaReplaced
}: Props) {
  const t = useTranslations("campaignCreator");
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regeneratePersonaId, setRegeneratePersonaId] = useState<string | null>(null);

  if (!open) return null;

  const canAutoFix = issues.some(
    (issue) =>
      !issue.allSegmentsInvalid &&
      (issue.replacements.some((r) => r.replacement) || issue.invalidSegments.length > 0)
  );

  function repairSeedFromIssue(issue: PersonaTargetingIssue): PersonaRepairSeed {
    return {
      personaId: issue.personaId,
      name: issue.personaName,
      description: issue.description,
      sourcePrompt: issue.sourcePrompt,
      ageMin: issue.ageMin,
      ageMax: issue.ageMax,
      gender: (issue.gender === "male" || issue.gender === "female" ? issue.gender : "all") as
        | "all"
        | "male"
        | "female",
      rejectedSegmentIds: issue.invalidSegments.map((s) => s.id),
      segments: issue.segments,
      metaReplacements: issue.replacements
    };
  }

  async function handleAutoFix(retryPublish: boolean) {
    setFixing(true);
    setError(null);
    try {
      const res = await fetch("/api/personas/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adAccountId,
          personaIds: issues.map((i) => i.personaId),
          autoFix: true,
          findReplacements: true
        })
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        skipped?: PersonaTargetingIssue[];
      };
      if (!j.ok) {
        setError(j.error ?? t("personaTargetingFixFailed"));
        return;
      }
      if (j.skipped?.length) {
        setRegeneratePersonaId(j.skipped[0]!.personaId);
        setError(t("personaTargetingAllInvalidHint"));
        return;
      }
      onResolved({ retryPublish });
    } catch {
      setError(t("personaTargetingFixFailed"));
    } finally {
      setFixing(false);
    }
  }

  return (
    <UxModalPortal open={open} onClose={onClose}>
      <UxWizardModalPanel size="xl" className="max-h-[min(920px,92vh)]">
        <div className="space-y-2 border-b border-[var(--border-color)] p-5">
          <h2 className="font-heading text-lg text-[var(--text-main)]">
            {t("personaTargetingRepairTitle")}
          </h2>
          <p className="text-sm text-[var(--text-dim)]">{t("personaTargetingRepairBody")}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-[var(--text-dim)]">{t("personaTargetingValidating")}</p>
          ) : issues.length === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">{t("personaTargetingNoPersonaToFix")}</p>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.personaId}
                className="space-y-3 rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
              >
                <p className="text-sm font-semibold text-[var(--text-main)]">{issue.personaName}</p>
                {issue.allSegmentsInvalid ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    {t("personaTargetingAllInvalidHint")}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-dim)]">{t("personaTargetingInvalidList")}</p>
                )}

                <PersonaSegmentAuditPanel issue={issue} />

                {issue.allSegmentsInvalid || regeneratePersonaId === issue.personaId ? (
                  <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3">
                    <p className="mb-2 text-xs text-[var(--text-dim)]">
                      {t("personaTargetingRegenerateHint")}
                    </p>
                    <AiPersonaForm
                      clientSlug={clientSlug}
                      adAccountId={adAccountId}
                      repairSeed={repairSeedFromIssue(issue)}
                      onClose={() => setRegeneratePersonaId(null)}
                      onSaved={(personaId) => {
                        if (personaId) {
                          onPersonaReplaced?.(issue.personaId, personaId);
                        }
                        setRegeneratePersonaId(null);
                        onResolved({ retryPublish: false });
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="ui-link text-xs"
                    onClick={() => setRegeneratePersonaId(issue.personaId)}
                  >
                    {t("personaTargetingRegenerate")}
                  </button>
                )}
              </div>
            ))
          )}

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--border-color)] p-5">
          {canAutoFix ? (
            <>
              <button
                type="button"
                className="ui-btn-primary flex-1 text-sm"
                disabled={fixing}
                onClick={() => void handleAutoFix(true)}
              >
                {fixing ? t("personaTargetingFixing") : t("personaTargetingReplaceAndPublish")}
              </button>
              <button
                type="button"
                className="ui-btn-secondary flex-1 text-sm"
                disabled={fixing}
                onClick={() => void handleAutoFix(false)}
              >
                {t("personaTargetingReplaceOnly")}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="w-full text-sm text-[var(--text-dim)] underline"
            onClick={onClose}
          >
            {t("personaTargetingBackToCampaign")}
          </button>
        </div>
      </UxWizardModalPanel>
    </UxModalPortal>
  );
}
